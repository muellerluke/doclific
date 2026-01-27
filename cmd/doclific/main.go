package main

import (
	"fmt"
	"os"

	"doclific/internal/config"
	"doclific/internal/core"
	"doclific/internal/server"

	"github.com/spf13/cobra"
)

var rootCmd = &cobra.Command{
	Use:   "doclific",
	Short: "A powerful documentation tool",
	Long:  `Doclific is a documentation tool for creating and managing documentation with a modern web interface.`,
	Run: func(cmd *cobra.Command, args []string) {
		isInGitRepo, err := core.IsInGitRepo()
		if err != nil {
			fmt.Fprintf(os.Stderr, "❌ Error: %v\n", err)
			os.Exit(1)
		}
		if !isInGitRepo {
			fmt.Fprintf(os.Stderr, "❌ Error: Not in a git repository; ensure Doclific is running in an initialized git repository\n")
			os.Exit(1)
		}
		// Default command - start the server
		port, _ := cmd.Flags().GetInt("port")
		if err := server.StartServer(port); err != nil {
			fmt.Fprintf(os.Stderr, "❌ Error: %v\n", err)
			os.Exit(1)
		}
	},
}

var initCmd = &cobra.Command{
	Use:   "init",
	Short: "Initialize a new Doclific project",
	Long:  `Initialize a new Doclific project in the current directory.`,
	Run: func(cmd *cobra.Command, args []string) {
		isInGitRepo, err := core.IsInGitRepo()
		if err != nil {
			fmt.Fprintf(os.Stderr, "❌ Error: %v\n", err)
			os.Exit(1)
		}
		if !isInGitRepo {
			fmt.Fprintf(os.Stderr, "❌ Error: Not in a git repository; ensure Doclific is running in an initialized git repository\n")
			os.Exit(1)
		}
		fmt.Println("🚀 Initializing Doclific project...")
		fmt.Println("   This will create a 'doclific' directory in the current folder.")
		if err := core.CreateDoclificFolder(); err != nil {
			fmt.Fprintf(os.Stderr, "❌ Error: %v\n", err)
			os.Exit(1)
		}
	},
}

var getCmd = &cobra.Command{
	Use:   "get [key]",
	Short: "Get configuration value (DEEPLINK_PREFIX)",
	Long:  `Get a configuration value from the Doclific config.`,
	Args:  cobra.ExactArgs(1),
	Run: func(cmd *cobra.Command, args []string) {
		key := args[0]
		value, err := config.GetConfigValue(key)
		if err != nil {
			fmt.Fprintf(os.Stderr, "❌ Error: %v\n", err)
			os.Exit(1)
		}

		if value == "" {
			fmt.Printf("📋 %s: (not set)\n", key)
		} else {
			fmt.Printf("📋 %s: %s\n", key, value)
		}
	},
}

var setCmd = &cobra.Command{
	Use:   "set [key] [value]",
	Short: "Set a configuration value",
	Long:  `Set a configuration value in the Doclific config.`,
	Args:  cobra.ExactArgs(2),
	Run: func(cmd *cobra.Command, args []string) {
		key := args[0]
		value := args[1]
		if err := config.SetConfigValue(key, value); err != nil {
			fmt.Fprintf(os.Stderr, "❌ Error: %v\n", err)
			os.Exit(1)
		}

		// Mask API keys for security
		displayValue := value
		if key == "OPENAI_API_KEY" || key == "ANTHROPIC_API_KEY" || key == "GOOGLE_API_KEY" {
			displayValue = maskAPIKey(value)
		}

		fmt.Printf("✅ Successfully set %s to %s\n", key, displayValue)
	},
}

var versionCmd = &cobra.Command{
	Use:   "version",
	Short: "Show the version",
	Long:  `Show the version of the Doclific CLI.`,
	Run: func(cmd *cobra.Command, args []string) {
		version, err := core.GetCurrentVersion()
		if err != nil {
			fmt.Printf("Doclific CLI version: unknown (error: %v)\n", err)
		} else {
			fmt.Printf("Doclific CLI %s\n", version)
		}
	},
}

var updateCmd = &cobra.Command{
	Use:   "update",
	Short: "Check for updates and install the latest version",
	Long:  `Check if a newer version is available and install it if found.`,
	Run: func(cmd *cobra.Command, args []string) {
		fmt.Println("🔍 Checking for updates...")

		isLatest, current, latest, err := core.IsLatestVersion()
		if err != nil {
			fmt.Fprintf(os.Stderr, "❌ Error checking version: %v\n", err)
			os.Exit(1)
		}

		if isLatest {
			fmt.Printf("✅ You are on the latest version: %s\n", current)
			return
		}

		fmt.Printf("📦 Update available: %s -> %s\n", current, latest)
		fmt.Println("🚀 Installing latest version...")

		if err := core.InstallLatestVersion(); err != nil {
			fmt.Fprintf(os.Stderr, "❌ Error installing update: %v\n", err)
			os.Exit(1)
		}

		fmt.Printf("✅ Successfully updated to %s!\n", latest)
	},
}

var checkCmd = &cobra.Command{
	Use:   "check",
	Short: "Check code snippets for changes",
	Long: `Scan all documentation files for code snippets and check if:
- Line numbers need to be updated (based on git changes)
- Content has changed and needs review`,
	Run: func(cmd *cobra.Command, args []string) {
		isInGitRepo, err := core.IsInGitRepo()
		if err != nil {
			fmt.Fprintf(os.Stderr, "❌ Error: %v\n", err)
			os.Exit(1)
		}
		if !isInGitRepo {
			fmt.Fprintf(os.Stderr, "❌ Error: Not in a git repository\n")
			os.Exit(1)
		}

		fix, _ := cmd.Flags().GetBool("fix")

		result, err := core.CheckSnippets(fix)
		if err != nil {
			fmt.Fprintf(os.Stderr, "❌ Error: %v\n", err)
			os.Exit(1)
		}

		// Print results
		fmt.Printf("\n📋 Snippet Check Results\n")
		fmt.Printf("   ──────────────────────\n")
		fmt.Printf("   Files scanned: %d\n", result.FilesScanned)
		fmt.Printf("   Snippets found: %d\n", result.SnippetsFound)

		if result.LinesUpdated > 0 {
			if fix {
				fmt.Printf("   ✅ Lines updated: %d\n", result.LinesUpdated)
			} else {
				fmt.Printf("   📝 Lines need updating: %d\n", result.LinesUpdated)
			}
		}

		if len(result.NeedsReview) > 0 {
			fmt.Printf("\n⚠️  Snippets needing review (%d):\n", len(result.NeedsReview))
			for _, snippet := range result.NeedsReview {
				fmt.Printf("   - %s: %s (lines %d-%d)\n",
					snippet.DocPath, snippet.FilePath, snippet.LineStart, snippet.LineEnd)
			}
		}

		if len(result.Errors) > 0 {
			fmt.Printf("\n❌ Errors (%d):\n", len(result.Errors))
			for _, errMsg := range result.Errors {
				fmt.Printf("   - %s\n", errMsg)
			}
		}

		if result.LinesUpdated == 0 && len(result.NeedsReview) == 0 && len(result.Errors) == 0 {
			fmt.Printf("\n✅ All snippets are up to date!\n")
		} else if !fix && result.LinesUpdated > 0 {
			fmt.Printf("\n💡 Run 'doclific check --fix' to automatically update line numbers\n")
		}
	},
}

func init() {
	rootCmd.Flags().IntP("port", "p", 6767, "port to listen on")
	checkCmd.Flags().BoolP("fix", "f", false, "automatically update line numbers")
	// Add commands to root
	rootCmd.AddCommand(initCmd)
	rootCmd.AddCommand(getCmd)
	rootCmd.AddCommand(setCmd)
	rootCmd.AddCommand(versionCmd)
	rootCmd.AddCommand(updateCmd)
	rootCmd.AddCommand(checkCmd)
}

// maskAPIKey masks an API key for display (shows first 4 and last 4 characters)
func maskAPIKey(key string) string {
	if len(key) <= 8 {
		return "****"
	}
	return key[:4] + "..." + key[len(key)-4:]
}

func main() {
	if err := rootCmd.Execute(); err != nil {
		fmt.Fprintf(os.Stderr, "❌ Error: %v\n", err)
		os.Exit(1)
	}
}
