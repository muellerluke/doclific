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
        [CodebaseSnippetType]: {
          serialize: (slateNode) => {
            return {
              type: 'mdxJsxFlowElement',
              name: 'CodebaseSnippet', // MDX tag name
              attributes: [
                { type: 'mdxJsxAttribute', name: 'filePath', value: slateNode.filePath || '' },
                { type: 'mdxJsxAttribute', name: 'lineStart', value: slateNode.lineStart || '' },
                { type: 'mdxJsxAttribute', name: 'lineEnd', value: slateNode.lineEnd || '' },
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
