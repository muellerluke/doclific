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
      },
      {
        "type": "object",
        "properties": {
          "nodeType": {
            "type": "string",
            "const": "erd"
          },
          "tables": {
            "type": "array",
            "items": {
              "type": "object",
              "properties": {
                "name": {
                  "type": "string",
                  "description": "The name of the table"
                },
                "columns": {
                  "type": "array",
                  "items": {
                    "type": "object",
                    "properties": {
                      "id": {
                        "type": "string"
                      },
                      "name": {
                        "type": "string"
                      },
                      "type": {
                        "type": "string",
                        "enum": [
                          "smallint",
                          "integer",
                          "bigint",
                          "decimal",
                          "numeric",
                          "real",
                          "double precision",
                          "smallserial",
                          "serial",
                          "bigserial",
                          "money",
                          "char",
                          "varchar",
                          "text",
                          "bytea",
                          "date",
                          "time",
                          "timetz",
                          "timestamp",
                          "timestamptz",
                          "interval",
                          "boolean",
                          "inet",
                          "cidr",
                          "macaddr",
                          "macaddr8",
                          "bit",
                          "bit varying",
                          "varbit",
                          "tsvector",
                          "tsquery",
                          "uuid",
                          "xml",
                          "json",
                          "jsonb",
                          "point",
                          "line",
                          "lseg",
                          "box",
                          "path",
                          "polygon",
                          "circle",
                          "int4range",
                          "int8range",
                          "numrange",
                          "daterange",
                          "tsrange",
                          "tstzrange",
                          "pg_lsn",
                          "txid_snapshot"
                        ]
                      },
                      "nullable": {
                        "type": "boolean"
                      },
                      "primaryKey": {
                        "type": "boolean"
                      },
                      "unique": {
                        "type": "boolean"
                      }
                    },
                    "required": [
                      "id",
                      "name",
                      "type",
                      "nullable"
                    ],
                    "additionalProperties": false
                  }
                },
                "position": {
                  "type": "object",
                  "properties": {
                    "x": {
                      "type": "number",
                      "minimum": -100,
                      "maximum": 100,
                      "description": "The x position of the table"
                    },
                    "y": {
                      "type": "number",
                      "minimum": -100,
                      "maximum": 100,
                      "description": "The y position of the table"
                    }
                  },
                  "required": [
                    "x",
                    "y"
                  ],
                  "additionalProperties": false
                }
              },
              "required": [
                "name",
                "columns",
                "position"
              ],
              "additionalProperties": false
            }
          },
          "relationships": {
            "type": "array",
            "items": {
              "type": "object",
              "properties": {
                "table1": {
                  "type": "string",
                  "description": "The name of the first table"
                },
                "table2": {
                  "type": "string",
                  "description": "The name of the second table"
                },
                "cardinality": {
                  "type": "string",
                  "enum": [
                    "1:1",
                    "1:N",
                    "N:N",
                    "N:1"
                  ],
                  "description": "The cardinality of the relationship -- 1:1, 1:N, N:N, N:1 where the first character is table1 and the second character is table2"
                }
              },
              "required": [
                "table1",
                "table2",
                "cardinality"
              ],
              "additionalProperties": false
            }
          }
        },
        "required": [
          "nodeType",
          "tables",
          "relationships"
        ],
        "additionalProperties": false
      }
    ]
  }
}`

var erdSchemaJSON = `
{
  "$schema": "https://json-schema.org/draft/2020-12/schema",
  "type": "object",
  "properties": {
    "nodeType": {
      "type": "string",
      "const": "erd"
    },
    "tables": {
      "type": "array",
      "items": {
        "type": "object",
        "properties": {
          "name": {
            "type": "string",
            "description": "The name of the table"
          },
          "columns": {
            "type": "array",
            "items": {
              "type": "object",
              "properties": {
                "id": {
                  "type": "string"
                },
                "name": {
                  "type": "string"
                },
                "type": {
                  "type": "string",
                  "enum": [
                    "smallint",
                    "integer",
                    "bigint",
                    "decimal",
                    "numeric",
                    "real",
                    "double precision",
                    "smallserial",
                    "serial",
                    "bigserial",
                    "money",
                    "char",
                    "varchar",
                    "text",
                    "bytea",
                    "date",
                    "time",
                    "timetz",
                    "timestamp",
                    "timestamptz",
                    "interval",
                    "boolean",
                    "inet",
                    "cidr",
                    "macaddr",
                    "macaddr8",
                    "bit",
                    "bit varying",
                    "varbit",
                    "tsvector",
                    "tsquery",
                    "uuid",
                    "xml",
                    "json",
                    "jsonb",
                    "point",
                    "line",
                    "lseg",
                    "box",
                    "path",
                    "polygon",
                    "circle",
                    "int4range",
                    "int8range",
                    "numrange",
                    "daterange",
                    "tsrange",
                    "tstzrange",
                    "pg_lsn",
                    "txid_snapshot"
                  ]
                },
                "nullable": {
                  "type": "boolean"
                },
                "primaryKey": {
                  "type": "boolean"
                },
                "unique": {
                  "type": "boolean"
                }
              },
              "required": [
                "id",
                "name",
                "type",
                "nullable"
              ],
              "additionalProperties": false
            }
          },
          "position": {
            "type": "object",
            "properties": {
              "x": {
                "type": "number",
                "minimum": -100,
                "maximum": 100,
                "description": "The x position of the table"
              },
              "y": {
                "type": "number",
                "minimum": -100,
                "maximum": 100,
                "description": "The y position of the table"
              }
            },
            "required": [
              "x",
              "y"
            ],
            "additionalProperties": false
          }
        },
        "required": [
          "name",
          "columns",
          "position"
        ],
        "additionalProperties": false
      }
    },
    "relationships": {
      "type": "array",
      "items": {
        "type": "object",
        "properties": {
          "table1": {
            "type": "string",
            "description": "The name of the first table"
          },
          "column1": {
            "type": "string",
            "description": "The name of the first column"
          },
          "table2": {
            "type": "string",
            "description": "The name of the second table"
          },
          "column2": {
            "type": "string",
            "description": "The name of the second column"
          },
          "cardinality": {
            "type": "string",
            "enum": [
              "1:1",
              "1:N",
              "N:N",
              "N:1"
            ],
            "description": "The cardinality of the relationship -- 1:1, 1:N, N:N, N:1"
          }
        },
        "required": [
          "table1",
          "column1",
          "table2",
          "column2",
          "cardinality"
        ],
        "additionalProperties": false
      }
    }
  },
  "required": [
    "nodeType",
    "tables",
    "relationships"
  ],
  "additionalProperties": false
}`

func getCreateDatabaseSchemaSchema() *genai.Schema {
	var schema genai.Schema
	err := json.Unmarshal([]byte(erdSchemaJSON), &schema)
	if err != nil {
		panic(fmt.Sprintf("Invalid JSON schema: %v", err))
	}

	return &schema
}

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

type createDatabaseSchemaArgs struct {
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

func executeCreateDatabaseSchema(ctx tool.Context, args createDatabaseSchemaArgs) (map[string]any, error) {
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

	model, err := gemini.NewModel(context.Background(), modelName, &genai.ClientConfig{
		APIKey: googleAPIKey,
	})
	if err != nil {
		return nil, fmt.Errorf("failed to create model: %v", err)
	}

	erdAgent, err := llmagent.New(llmagent.Config{
		Name:         "database_schema_agent",
		Model:        model,
		Description:  "You generate database ERD schemas from model files.",
		Instruction:  "Return a JSON object that matches the ERD schema exactly. Only include the JSON object.",
		OutputSchema: getCreateDatabaseSchemaSchema(),
		OutputKey:    "erd_schema",
	})
	if err != nil {
		return nil, fmt.Errorf("failed to create ERD agent: %v", err)
	}

	var promptBuilder strings.Builder
	promptBuilder.WriteString("Generate a database ERD from the following file contents.\n\n")
	for _, file := range args.FileContents {
		promptBuilder.WriteString("File: ")
		promptBuilder.WriteString(file.FilePath)
		promptBuilder.WriteString("\n")
		promptBuilder.WriteString(file.Contents)
		promptBuilder.WriteString("\n\n")
	}

	sessionService := session.InMemoryService()
	createdSession, err := sessionService.Create(context.Background(), &session.CreateRequest{
		AppName: "database_schema_agent",
		UserID:  "user_123",
	})
	if err != nil {
		return nil, fmt.Errorf("failed to create session: %v", err)
	}

	subRunner, err := runner.New(runner.Config{
		Agent:          erdAgent,
		AppName:        "database_schema_agent",
		SessionService: sessionService,
	})
	if err != nil {
		return nil, fmt.Errorf("failed to create runner: %v", err)
	}

	userContent := &genai.Content{
		Role: "user",
		Parts: []*genai.Part{
			{
				Text: promptBuilder.String(),
			},
		},
	}

	eventsAndErrs := subRunner.Run(context.Background(), "user_123", createdSession.Session.ID(), userContent, agent.RunConfig{})
	for _, err := range eventsAndErrs {
		if err != nil {
			return nil, err
		}
	}

	resp, err := sessionService.Get(context.Background(), &session.GetRequest{
		AppName:   "database_schema_agent",
		UserID:    "user_123",
		SessionID: createdSession.Session.ID(),
	})
	if err != nil {
		return nil, err
	}

	state := resp.Session.State()
	val, err := state.Get("erd_schema")
	if err != nil {
		return nil, fmt.Errorf("erd_schema key not found in state")
	}

	switch v := val.(type) {
	case map[string]any:
		return v, nil
	case string:
		var parsed map[string]any
		if err := json.Unmarshal([]byte(v), &parsed); err != nil {
			return nil, fmt.Errorf("failed to parse ERD schema: %w", err)
		}
		return parsed, nil
	default:
		raw, err := json.Marshal(v)
		if err != nil {
			return nil, fmt.Errorf("failed to marshal ERD schema: %w", err)
		}
		var parsed map[string]any
		if err := json.Unmarshal(raw, &parsed); err != nil {
			return nil, fmt.Errorf("failed to parse ERD schema: %w", err)
		}
		return parsed, nil
	}
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
	if err != nil {
		return nil, fmt.Errorf("failed to create getFileContents tool: %v", err)
	}

	createDatabaseSchemaTool, err := functiontool.New(
		functiontool.Config{
			Name:        "createDatabaseSchema",
			Description: "Create an ERD schema from file contents returned by getFileContents.",
		},
		executeCreateDatabaseSchema,
	)
	if err != nil {
		return nil, fmt.Errorf("failed to create createDatabaseSchema tool: %v", err)
	}

	richTextAgent, err := llmagent.New(llmagent.Config{
		Name:         "rich_text_agent",
		Model:        model,
		Description:  "You are a helpful assistant that writes documentation in rich text format.",
		Instruction:  getRichTextInstruction(),
		OutputSchema: getRichTextSchema(),
		OutputKey:    "rich_text",
		Tools:        []tool.Tool{fileContentsTool, createDatabaseSchemaTool},
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
	NodeType      string   `json:"nodeType"`
	Type          string   `json:"type,omitempty"`
	Text          string   `json:"text,omitempty"`
	FilePath      string   `json:"filePath,omitempty"`
	LineStart     int      `json:"lineStart,omitempty"`
	LineEnd       int      `json:"lineEnd,omitempty"`
	Items         []string `json:"items,omitempty"`
	Tables        []any    `json:"tables,omitempty"`
	Relationships []any    `json:"relationships,omitempty"`
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
