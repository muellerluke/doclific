package core

import (
	"fmt"
	"testing"
)

func TestGetRepoName(t *testing.T) {
	repoName, err := GetRepoName()
	if err != nil {
		t.Fatalf("failed to get repo name: %v", err)
	}
	fmt.Println(repoName)
}

func TestGetCurrentBranch(t *testing.T) {
	branch, err := GetCurrentBranch()
	if err != nil {
		t.Fatalf("failed to get current branch: %v", err)
	}
	fmt.Println(branch)
}

func TestGetGitUsername(t *testing.T) {
	username, err := GetGitUsername()
	if err != nil {
		t.Fatalf("failed to get git username: %v", err)
	}
	fmt.Println(username)
}

func TestGetGitEmail(t *testing.T) {
	email, err := GetGitEmail()
	if err != nil {
		t.Fatalf("failed to get git email: %v", err)
	}
	fmt.Println(email)
}
