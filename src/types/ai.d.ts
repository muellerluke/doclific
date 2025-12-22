import type { ModelMessage, ToolSet } from 'ai';

export type ToolCall = {
	id: string;
	name: string;
	args: Record<string, unknown>;
};

export type ModelResult =
	| { type: 'text'; content: string }
	| { type: 'tool_call'; calls: ToolCall[] };

export interface ModelAdapter {
	stream(messages: ModelMessage[], tools?: ToolSet): AsyncIterable<ModelResult>;
}
