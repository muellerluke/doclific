import { MarkdownPlugin, remarkMdx, remarkMention } from '@platejs/markdown';
import { KEYS } from 'platejs';
import remarkGfm from 'remark-gfm';
import remarkMath from 'remark-math';
import { CodebaseSnippetType } from './codebase-kit';

export const MarkdownKit = [
  MarkdownPlugin.configure({
    options: {
      plainMarks: [KEYS.suggestion, KEYS.comment],
      remarkPlugins: [remarkMath, remarkGfm, remarkMdx, remarkMention],
      rules: {
        [KEYS.excalidraw]: {
          serialize: (slateNode) => {
            return {
              type: 'mdxJsxFlowElement',
              name: 'Excalidraw',
              attributes: [
                {
                  type: 'mdxJsxAttribute',
                  name: 'data',
                  value: JSON.stringify(slateNode.data),
                },
              ],
              children: [{ type: 'text', value: '' }],
            };
          },
        },
        Excalidraw: {
          deserialize: (mdastNode) => {
            const dataAttr = mdastNode.attributes?.find((a: { name: string }) => a.name === 'data');
            const data = dataAttr?.value ? JSON.parse(dataAttr.value) : { elements: [], state: {} };
            data.state.collaborators = new Map(Object.entries(data.state.collaborators || {}));
            return {
              type: KEYS.excalidraw,
              data,
              children: [{ text: '' }],
            };
          },
        },
        [CodebaseSnippetType]: {
          serialize: (slateNode) => {
            return {
              type: 'mdxJsxFlowElement',
              name: 'CodebaseSnippet', // MDX tag name
              attributes: [
                { type: 'mdxJsxAttribute', name: 'filePath', value: slateNode.filePath || '' },
                { type: 'mdxJsxAttribute', name: 'lineStart', value: String(slateNode.lineStart || '') },
                { type: 'mdxJsxAttribute', name: 'lineEnd', value: String(slateNode.lineEnd || '') },
              ],
              children: [{ type: 'text', value: '' }],
            };
          },
          deserialize: (mdastNode) => {
            // Extract attributes from the mdast node
            const getAttr = (name: string) => {
              const attr = mdastNode.attributes?.find((a: { name: string }) => a.name === name);
              return attr?.value || '';
            };

            // Return a Slate node structure
            return {
              type: CodebaseSnippetType,
              filePath: getAttr('filePath'),
              lineStart: getAttr('lineStart'),
              lineEnd: getAttr('lineEnd'),
              children: [{ text: '' }], // Required for void elements
            };
          }
        },
      },
    }
  })
];
