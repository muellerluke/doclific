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
	Short: "Get configuration value (DEEPLINK_PREFIX, AI_PROVIDER, AI_MODEL, OPENAI_API_KEY, ANTHROPIC_API_KEY, GOOGLE_API_KEY)",
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
			// Mask API keys for security
			if key == "OPENAI_API_KEY" || key == "ANTHROPIC_API_KEY" || key == "GOOGLE_API_KEY" {
				masked := maskAPIKey(value)
				fmt.Printf("📋 %s: %s\n", key, masked)
			} else {
				fmt.Printf("📋 %s: %s\n", key, value)
			}
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

func init() {
	rootCmd.Flags().IntP("port", "p", 6767, "port to listen on")
	// Add commands to root
	rootCmd.AddCommand(initCmd)
	rootCmd.AddCommand(getCmd)
	rootCmd.AddCommand(setCmd)
	rootCmd.AddCommand(versionCmd)
	rootCmd.AddCommand(updateCmd)
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
