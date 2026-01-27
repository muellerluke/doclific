import { MarkdownPlugin, remarkMdx, remarkMention } from '@platejs/markdown';
import { KEYS } from 'platejs';
import remarkGfm from 'remark-gfm';
import remarkMath from 'remark-math';
import { CodebaseSnippetType } from './codebase-kit';
import { ERDType } from './erd-kit';

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
        [ERDType]: {
          serialize: (slateNode) => {
            return {
              type: 'mdxJsxFlowElement',
              name: ERDType,
              attributes: [
                { type: 'mdxJsxAttribute', name: 'tables', value: slateNode.tables ? JSON.stringify(slateNode.tables) : '[]' },
                { type: 'mdxJsxAttribute', name: 'relationships', value: slateNode.relationships ? JSON.stringify(slateNode.relationships) : '[]' },
              ],
              children: [{ type: 'text', value: '' }],
            };
          },
          deserialize: (mdastNode) => {
            const getAttr = (name: string) => {
              const attr = mdastNode.attributes?.find((a: { name: string }) => a.name === name);
              return attr?.value ? JSON.parse(attr.value) : [];
            };

            return {
              type: ERDType,
              tables: getAttr('tables'),
              relationships: getAttr('relationships'),
              children: [{ text: '' }],
            }
          }
        },
        [CodebaseSnippetType]: {
          serialize: (slateNode) => {
            const attributes = [
              { type: 'mdxJsxAttribute', name: 'filePath', value: slateNode.filePath || '' },
              { type: 'mdxJsxAttribute', name: 'lineStart', value: String(slateNode.lineStart || '') },
              { type: 'mdxJsxAttribute', name: 'lineEnd', value: String(slateNode.lineEnd || '') },
            ];

            // Add tracking attributes if they exist
            if (slateNode.baseCommit) {
              attributes.push({ type: 'mdxJsxAttribute', name: 'baseCommit', value: slateNode.baseCommit });
            }
            if (slateNode.contentHash) {
              attributes.push({ type: 'mdxJsxAttribute', name: 'contentHash', value: slateNode.contentHash });
            }
            if (slateNode.needsReview) {
              attributes.push({ type: 'mdxJsxAttribute', name: 'needsReview', value: slateNode.needsReview });
            }

            return {
              type: 'mdxJsxFlowElement',
              name: 'CodebaseSnippet', // MDX tag name
              attributes,
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
              baseCommit: getAttr('baseCommit'),
              contentHash: getAttr('contentHash'),
              needsReview: getAttr('needsReview'),
              children: [{ text: '' }], // Required for void elements
            };
          }
        },
      },
    }
  })
];
