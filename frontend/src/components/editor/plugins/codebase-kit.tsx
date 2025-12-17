import { createPlatePlugin } from "platejs/react";
import { CodebaseSnippetElement } from "@/components/ui/codebase-snippet-node";

export const CodebaseSnippetType = 'CodebaseSnippet';

export interface CodebaseSnippetElementType {
    type: typeof CodebaseSnippetType;
    filePath?: string;
    lineStart?: string;
    lineEnd?: string;
    children: [{ text: '' }];
    [key: string]: any;
}


export const CodebaseSnippetPlugin = createPlatePlugin({
    key: CodebaseSnippetType,
    node: {
        isElement: true,
        isVoid: true,
        component: CodebaseSnippetElement
    }
})