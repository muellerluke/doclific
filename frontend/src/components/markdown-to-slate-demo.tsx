import { MarkdownPlugin, remarkMdx, remarkMention } from '@platejs/markdown';
import { Plate, usePlateEditor } from 'platejs/react';
import remarkEmoji from 'remark-emoji';
import remarkGfm from 'remark-gfm';
import remarkMath from 'remark-math';
import { useEffect, useRef } from 'react';

import { EditorKit } from '@/components/editor/editor-kit';
import { Editor, EditorContainer } from '@/components/ui/editor';

export default function MarkdownDemo(
  { initialMarkdown, onUpdate }: { initialMarkdown: string, onUpdate: (content: string) => void }
) {
  const previousMarkdown = useRef<string>('');
  const editor = usePlateEditor(
    {
      plugins: EditorKit,
      value: (editor) => editor.getApi(MarkdownPlugin).markdown.deserialize(initialMarkdown, {
        remarkPlugins: [
          remarkMath,
          remarkGfm,
          remarkMdx,
          remarkMention,
          remarkEmoji as any,
        ],
      })
    },
    []
  );

  // useEffect that runs every 250ms and logs the serialized markdown to the console
  useEffect(() => {
    const interval = setInterval(() => {
      // log current editor value to the console
      const serialized = editor.getApi(MarkdownPlugin).markdown.serialize();
      if (serialized !== previousMarkdown.current) {
        previousMarkdown.current = serialized;
        onUpdate(serialized);
      }
    }, 500);
    return () => clearInterval(interval);
  }, [onUpdate, editor]);

  return (
    <Plate editor={editor}>
      <EditorContainer>
        <Editor variant="none" className="px-8 py-2" />
      </EditorContainer>
    </Plate>
  );
}
