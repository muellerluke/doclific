package core

import (
	"context"
	"encoding/json"
	"fmt"

	"google.golang.org/adk/agent"
	"google.golang.org/adk/agent/llmagent"
	"google.golang.org/adk/model/gemini"
	"google.golang.org/adk/runner"
	"google.golang.org/adk/session"
	"google.golang.org/genai"

	"doclific/internal/config"
)

const agentInstruction = `You are a structured documentation generator. 
Generate a rich-text document as an array of objects based on the user's request.

For each object in the array, follow these strict rules:
1. If "nodeType" is "text":
   - Set "type" to "p", "h1", "h2", or "h3".
   - Set "text" to the content string.
2. If "nodeType" is "list":
   - Set "type" to "numbered" or "bulleted".
   - Set "items" to an array of strings.
3. If "nodeType" is "codebase snippet":
   - Provide "filePath", "lineStart", and "lineEnd".

CRITICAL: Output ONLY the raw JSON array. No markdown code fences (like ` + "```json" + `), no backticks, and no introductory text. The first character must be '[' and the last must be ']'.`

var richTextJSONSchema = `
{
  "type": "array",
  "items": {
    "type": "object",
    "properties": {
      "nodeType": { 
        "type": "string", 
        "enum": ["text", "codebase snippet", "list"],
        "description": "The type of content node"
      },
      "type": { 
        "type": "string", 
        "enum": ["p", "h1", "h2", "h3", "numbered", "bulleted"],
        "description": "Sub-type for text or list nodes"
      },
      "text": { "type": "string", "description": "The actual text content" },
      "filePath": { "type": "string", "description": "Path to the file for code snippets" },
      "lineStart": { "type": "integer" },
      "lineEnd": { "type": "integer" },
      "items": { 
        "type": "array", 
        "items": { "type": "string" },
        "description": "Array of strings for list nodes"
      }
    },
    "required": ["nodeType"]
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

func GenerateRichText() ([]any, error) {
	ctx := context.Background()

	googleAPIKey, err := config.GetConfigValue("GOOGLE_API_KEY")
	if err != nil {
		return nil, fmt.Errorf("failed to get Google API key: %v", err)
	}

    model, err := gemini.NewModel(ctx, "gemini-3-flash-preview", &genai.ClientConfig{
        APIKey: googleAPIKey,
    })
    if err != nil {
        return nil, fmt.Errorf("failed to create model: %v", err)
    }

    richTextAgent, err := llmagent.New(llmagent.Config{
        Name:        "rich_text_agent",
        Model:       model,
        Description: "Pick something to document and document it.",
        Instruction: agentInstruction,
        OutputSchema: getRichTextSchema(),
		OutputKey:    "rich_text",
    })
    if err != nil {
        return nil, fmt.Errorf("failed to create agent: %v", err)
    }

	sessionService := session.InMemoryService()

	createdSession, err := sessionService.Create(ctx, &session.CreateRequest{
		AppName: "rich_text_agent",
		UserID: "user_123",
	})
	if err != nil {
		return nil, fmt.Errorf("failed to create session: %v", err)
	}

	myRunner, err := runner.New(runner.Config{
		Agent: richTextAgent,
		AppName: "rich_text_agent",
		SessionService: sessionService,
	})
	if err != nil {
		return nil, fmt.Errorf("failed to create runner: %v", err)
	}

	userContent := &genai.Content{
		Role: "user",
		Parts: []*genai.Part{
			{
				Text: "Generate a rich text document about the topic of the user's request.",
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
        AppName: "rich_text_agent",
        UserID: "user_123",
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


