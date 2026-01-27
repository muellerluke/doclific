package core

import (
	"bufio"
	"os/exec"
	"regexp"
	"strconv"
	"strings"
)

// get repo name via git
func GetRepoName() (string, error) {
	cmd := exec.Command("sh", "-c", "git config --get remote.origin.url | sed -E \"s|.*/(.+)\\.git|\\\\1|\"")
	output, err := cmd.Output()
	if err != nil {
		return "", err
	}
	return strings.TrimSpace(string(output)), nil
}

func IsInGitRepo() (bool, error) {
	cmd := exec.Command("git", "rev-parse", "--is-inside-work-tree")
	output, err := cmd.Output()
	if err != nil {
		return false, err
	}
	return strings.TrimSpace(string(output)) == "true", nil
}

// get current branch name via git
func GetCurrentBranch() (string, error) {
	cmd := exec.Command("git", "rev-parse", "--abbrev-ref", "HEAD")
	output, err := cmd.Output()
	if err != nil {
		return "", err
	}
	return strings.TrimSpace(string(output)), nil
}

// get git username via git
func GetGitUsername() (string, error) {
	cmd := exec.Command("git", "config", "user.name")
	output, err := cmd.Output()
	if err != nil {
		return "", err
	}
	return strings.TrimSpace(string(output)), nil
}

// get git email via git
func GetGitEmail() (string, error) {
	cmd := exec.Command("git", "config", "user.email")
	output, err := cmd.Output()
	if err != nil {
		return "", err
	}
	return strings.TrimSpace(string(output)), nil
}

// GetCurrentCommit returns the current HEAD commit hash
func GetCurrentCommit() (string, error) {
	cmd := exec.Command("git", "rev-parse", "HEAD")
	output, err := cmd.Output()
	if err != nil {
		return "", err
	}
	return strings.TrimSpace(string(output)), nil
}

// LineChange represents a line addition or deletion from git diff
type LineChange struct {
	OldStart int // Starting line in old file (0 if addition)
	OldCount int // Number of lines in old file
	NewStart int // Starting line in new file (0 if deletion)
	NewCount int // Number of lines in new file
}

// ParseGitDiff parses git diff output and extracts line changes
// Returns a slice of LineChange representing each hunk
func ParseGitDiff(diffOutput string) []LineChange {
	var changes []LineChange

	// Regex to match hunk headers: @@ -oldStart,oldCount +newStart,newCount @@
	// Examples: @@ -1,5 +1,7 @@  or  @@ -10 +10,2 @@  or  @@ -5,0 +6,3 @@
	hunkRegex := regexp.MustCompile(`@@ -(\d+)(?:,(\d+))? \+(\d+)(?:,(\d+))? @@`)

	scanner := bufio.NewScanner(strings.NewReader(diffOutput))
	for scanner.Scan() {
		line := scanner.Text()
		matches := hunkRegex.FindStringSubmatch(line)
		if len(matches) >= 4 {
			oldStart, _ := strconv.Atoi(matches[1])
			oldCount := 1
			if matches[2] != "" {
				oldCount, _ = strconv.Atoi(matches[2])
			}
			newStart, _ := strconv.Atoi(matches[3])
			newCount := 1
			if len(matches) >= 5 && matches[4] != "" {
				newCount, _ = strconv.Atoi(matches[4])
			}

			changes = append(changes, LineChange{
				OldStart: oldStart,
				OldCount: oldCount,
				NewStart: newStart,
				NewCount: newCount,
			})
		}
	}

	return changes
}

// GetFileDiff gets the diff for a specific file between two commits
func GetFileDiff(filePath, fromCommit, toCommit string) (string, error) {
	cmd := exec.Command("git", "diff", fromCommit, toCommit, "--", filePath)
	output, err := cmd.Output()
	if err != nil {
		return "", err
	}
	return string(output), nil
}

// GetFileDiffToWorkingDir gets the diff for a specific file from a commit to the working directory
func GetFileDiffToWorkingDir(filePath, fromCommit string) (string, error) {
	cmd := exec.Command("git", "diff", fromCommit, "--", filePath)
	output, err := cmd.Output()
	if err != nil {
		return "", err
	}
	return string(output), nil
}

// CalculateNewLineRange adjusts line numbers based on git diff between commits
// Takes the original line range and returns the new line range after applying changes
func CalculateNewLineRange(filePath, fromCommit, toCommit string, oldStart, oldEnd int) (newStart, newEnd int, err error) {
	diffOutput, err := GetFileDiff(filePath, fromCommit, toCommit)
	if err != nil {
		return oldStart, oldEnd, err
	}

	return calculateLineRangeFromDiff(diffOutput, oldStart, oldEnd)
}

// CalculateNewLineRangeToWorkingDir adjusts line numbers based on git diff from a commit to the working directory
// This captures both committed and uncommitted changes
func CalculateNewLineRangeToWorkingDir(filePath, fromCommit string, oldStart, oldEnd int) (newStart, newEnd int, err error) {
	diffOutput, err := GetFileDiffToWorkingDir(filePath, fromCommit)
	if err != nil {
		return oldStart, oldEnd, err
	}

	return calculateLineRangeFromDiff(diffOutput, oldStart, oldEnd)
}

// calculateLineRangeFromDiff is the shared implementation for calculating new line ranges from diff output
func calculateLineRangeFromDiff(diffOutput string, oldStart, oldEnd int) (newStart, newEnd int, err error) {
	// If no diff, lines haven't changed
	if strings.TrimSpace(diffOutput) == "" {
		return oldStart, oldEnd, nil
	}

	changes := ParseGitDiff(diffOutput)

	// Calculate the offset for lines before our snippet
	// We need to track how many lines were added/removed before the snippet start
	offsetBeforeStart := 0
	offsetBeforeEnd := 0

	for _, change := range changes {
		lineDelta := change.NewCount - change.OldCount

		// If this change ends before our snippet starts, apply full offset
		changeEndOld := change.OldStart + change.OldCount - 1
		if change.OldCount == 0 {
			// Pure addition - doesn't affect old line numbers directly
			// but we need to check if it's before our range in the new file
			if change.NewStart < oldStart+offsetBeforeStart {
				offsetBeforeStart += change.NewCount
				offsetBeforeEnd += change.NewCount
			} else if change.NewStart < oldEnd+offsetBeforeEnd {
				offsetBeforeEnd += change.NewCount
			}
			continue
		}

		if changeEndOld < oldStart {
			// Change is entirely before our snippet
			offsetBeforeStart += lineDelta
			offsetBeforeEnd += lineDelta
		} else if change.OldStart <= oldEnd {
			// Change overlaps with or is within our snippet
			// Only apply offset to end if change starts before end
			if change.OldStart < oldStart {
				// Change starts before snippet, affects start position
				offsetBeforeStart += lineDelta
				offsetBeforeEnd += lineDelta
			} else if change.OldStart <= oldEnd {
				// Change is within or at end of snippet
				offsetBeforeEnd += lineDelta
			}
		}
		// Changes after our snippet don't affect our line numbers
	}

	newStart = oldStart + offsetBeforeStart
	newEnd = oldEnd + offsetBeforeEnd

	// Ensure we don't have invalid line numbers
	if newStart < 1 {
		newStart = 1
	}
	if newEnd < newStart {
		newEnd = newStart
	}

	return newStart, newEnd, nil
}
