import { MarkdownPlugin, remarkMdx, remarkMention } from '@platejs/markdown';
import { Plate, usePlateEditor } from 'platejs/react';
import remarkEmoji from 'remark-emoji';
import remarkGfm from 'remark-gfm';
import remarkMath from 'remark-math';

import { EditorKit } from '@/components/editor/editor-kit';
import { Editor, EditorContainer } from '@/components/ui/editor';

export default function MarkdownDemo(
  { initialMarkdown }: { initialMarkdown: string }
) {
  const editor = usePlateEditor(
    {
      plugins: EditorKit,
      value: (editor) =>
        editor.getApi(MarkdownPlugin).markdown.deserialize(initialMarkdown, {
          remarkPlugins: [
            remarkMath,
            remarkGfm,
            remarkMdx,
            remarkMention,
            remarkEmoji as any,
          ],
        }),
    },
    []
  );

  return (
    <Plate editor={editor}>
      <EditorContainer>
        <Editor variant="none" className="px-4 py-2" />
      </EditorContainer>
    </Plate>
  );
}
