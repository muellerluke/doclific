package core

import (
	"context"
	"encoding/json"
	"fmt"
	"strings"

	"google.golang.org/adk/agent"
	"google.golang.org/adk/agent/llmagent"
	"google.golang.org/adk/model/gemini"
	"google.golang.org/adk/runner"
	"google.golang.org/adk/session"
	"google.golang.org/adk/tool"
	"google.golang.org/adk/tool/functiontool"
	"google.golang.org/genai"

	"doclific/internal/config"
)

func getRichTextInstruction() string {
	flatFileList, err := GetFlatFileList("", nil, "", nil)
	if err != nil {
		return ""
	}

	projectStructure := ""
	for _, filePath := range flatFileList {
		projectStructure += fmt.Sprintf("- %s\n", filePath)
	}

	return fmt.Sprintf(`
When writing documentation:
1. Explain concepts using "text" nodes
2. Reference implementation using "codebase snippet" nodes
3. Use "list" nodes only for summaries

If you need to show code, DO NOT paste it — reference it.

The project structure is: %s
`, projectStructure)
}

var richTextJSONSchema = `
{
  "$schema": "https://json-schema.org/draft/2020-12/schema",
  "type": "array",
  "items": {
    "anyOf": [
      {
        "type": "object",
        "properties": {
          "nodeType": {
            "type": "string",
            "const": "text"
          },
          "type": {
            "type": "string",
            "enum": [
              "p",
              "h1",
              "h2",
              "h3"
            ]
          },
          "text": {
            "type": "string"
          }
        },
        "required": [
          "nodeType",
          "type",
          "text"
        ],
        "additionalProperties": false
      },
      {
        "type": "object",
        "properties": {
          "nodeType": {
            "type": "string",
            "const": "codebase snippet"
          },
          "filePath": {
            "type": "string"
          },
          "lineStart": {
            "type": "number"
          },
          "lineEnd": {
            "type": "number"
          }
        },
        "required": [
          "nodeType",
          "filePath",
          "lineStart",
          "lineEnd"
        ],
        "additionalProperties": false
      },
      {
        "type": "object",
        "properties": {
          "nodeType": {
            "type": "string",
            "const": "list"
          },
          "type": {
            "type": "string",
            "enum": [
              "numbered",
              "bulleted"
            ]
          },
          "items": {
            "type": "array",
            "items": {
              "type": "string"
            }
          }
        },
        "required": [
          "nodeType",
          "type",
          "items"
        ],
        "additionalProperties": false
      }
    ]
  }
}`

func getRichTextSchema() *genai.Schema {
	var schema genai.Schema
	err := json.Unmarshal([]byte(richTextJSONSchema), &schema)
	if err != nil {
		panic(fmt.Sprintf("Invalid JSON schema: %v", err))
	}
	return &schema
}

// FileContentsResult represents the result of getting file contents
type fileContentsResults struct {
	FilePath string `json:"filePath"`
	Contents string `json:"contents"`
}

type getFileContentsArgs struct {
	FilePaths []string `json:"filePaths"`
}

type getFileContentsResults struct {
	FileContents []fileContentsResults `json:"fileContents"`
}

// executeGetFileContents executes the getFileContents tool
func executeGetFileContents(ctx tool.Context, args getFileContentsArgs) (getFileContentsResults, error) {
	results := make([]fileContentsResults, 0, len(args.FilePaths))

	for _, filePath := range args.FilePaths {
		contents, err := GetFileContents(filePath)
		if err != nil {
			// Continue with other files even if one fails
			results = append(results, fileContentsResults{
				FilePath: filePath,
				Contents: fmt.Sprintf("Error reading file: %v", err),
			})
			continue
		}

		// Format contents with line numbers (1-indexed)
		lines := strings.Split(contents, "\n")
		numberedLines := make([]string, len(lines))
		for i, line := range lines {
			numberedLines[i] = fmt.Sprintf("%d: %s", i+1, line)
		}

		results = append(results, fileContentsResults{
			FilePath: filePath,
			Contents: strings.Join(numberedLines, "\n"),
		})
	}

	return getFileContentsResults{
		FileContents: results,
	}, nil
}

func GenerateRichText(prompt string) ([]any, error) {
	ctx := context.Background()

	googleAPIKey, err := config.GetConfigValue("GOOGLE_API_KEY")
	if err != nil {
		return nil, fmt.Errorf("failed to get Google API key: %v", err)
	}

	// Get the model from the config, if not set, use the default
	modelName, err := config.GetConfigValue("AI_MODEL")
	if err != nil {
		return nil, fmt.Errorf("failed to get AI model: %v", err)
	}
	if modelName == "" {
		modelName = "gemini-3-flash-preview"
	}

	model, err := gemini.NewModel(ctx, modelName, &genai.ClientConfig{
		APIKey: googleAPIKey,
	})
	if err != nil {
		return nil, fmt.Errorf("failed to create model: %v", err)
	}

	fileContentsTool, err := functiontool.New(
		functiontool.Config{
			Name:        "getFileContents",
			Description: "Get the contents of a file by file path. Multiple file paths can be provided.",
		},
		executeGetFileContents,
	)

	richTextAgent, err := llmagent.New(llmagent.Config{
		Name:         "rich_text_agent",
		Model:        model,
		Description:  "You are a helpful assistant that writes documentation in rich text format.",
		Instruction:  getRichTextInstruction(),
		OutputSchema: getRichTextSchema(),
		OutputKey:    "rich_text",
		Tools:        []tool.Tool{fileContentsTool},
	})
	if err != nil {
		return nil, fmt.Errorf("failed to create agent: %v", err)
	}

	sessionService := session.InMemoryService()

	createdSession, err := sessionService.Create(ctx, &session.CreateRequest{
		AppName: "rich_text_agent",
		UserID:  "user_123",
	})
	if err != nil {
		return nil, fmt.Errorf("failed to create session: %v", err)
	}

	myRunner, err := runner.New(runner.Config{
		Agent:          richTextAgent,
		AppName:        "rich_text_agent",
		SessionService: sessionService,
	})
	if err != nil {
		return nil, fmt.Errorf("failed to create runner: %v", err)
	}

	userContent := &genai.Content{
		Role: "user",
		Parts: []*genai.Part{
			{
				Text: prompt,
			},
		},
	}

	eventsAndErrs := myRunner.Run(ctx, "user_123", createdSession.Session.ID(), userContent, agent.RunConfig{})

	// 1. Run the iterator to completion
	for _, err := range eventsAndErrs {
		if err != nil {
			return nil, err
		}
	}

	// 2. Fetch the session
	resp, err := sessionService.Get(ctx, &session.GetRequest{
		AppName:   "rich_text_agent",
		UserID:    "user_123",
		SessionID: createdSession.Session.ID(),
	})
	if err != nil {
		return nil, err
	}

	// 3. Use the .Get() method on the State interface
	state := resp.Session.State()
	val, err := state.Get("rich_text")
	if err != nil {
		return nil, fmt.Errorf("rich_text key not found in state")
	}

	// Use the round-trip helper
	nodes, err := ExtractNodes(val)
	if err != nil {
		return nil, fmt.Errorf("failed to parse nodes: %w", err)
	}

	// To satisfy your []any return type:
	result := make([]any, len(nodes))
	for i, v := range nodes {
		result[i] = v
	}
	return result, nil
}

// Define a struct that matches your "Superset" schema
type RichTextNode struct {
	NodeType  string   `json:"nodeType"`
	Type      string   `json:"type,omitempty"`
	Text      string   `json:"text,omitempty"`
	FilePath  string   `json:"filePath,omitempty"`
	LineStart int      `json:"lineStart,omitempty"`
	LineEnd   int      `json:"lineEnd,omitempty"`
	Items     []string `json:"items,omitempty"`
}

func ExtractNodes(val any) ([]RichTextNode, error) {
	var rawBytes []byte
	var err error

	switch v := val.(type) {
	case string:
		// Case A: The ADK gave us a raw JSON string
		rawBytes = []byte(v)
	default:
		// Case B: The ADK gave us a Go object (map/slice)
		rawBytes, err = json.Marshal(v)
		if err != nil {
			return nil, err
		}
	}

	var nodes []RichTextNode
	if err := json.Unmarshal(rawBytes, &nodes); err != nil {
		return nil, fmt.Errorf("final unmarshal failed: %w (raw data: %s)", err, string(rawBytes))
	}

	return nodes, nil
}
