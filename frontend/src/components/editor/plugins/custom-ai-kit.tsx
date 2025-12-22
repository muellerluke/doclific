import { createPlatePlugin, type PlateEditor } from 'platejs/react';
import { type TElement } from 'platejs';
import { AIPromptElement } from '@/components/ui/ai-node';

export const CustomAIPlugin = createPlatePlugin({
    key: 'custom-ai',
    node: {
        isElement: true,
        isInline: true,
        isVoid: true,
    },
    api: {
        aiChat: {
            show(editor: PlateEditor) {
                // Insert the AI prompt element at current selection
                editor.tf.insertNodes({
                    type: editor.getType('custom-ai'),
                    children: [{ text: '' }],
                } as TElement);

                editor.setOption(CustomAIPlugin, 'open', true);
                editor.setOption(CustomAIPlugin, 'mode', 'prompt');
            },
            hide(editor: PlateEditor) {
                editor.setOption(CustomAIPlugin, 'open', false);
                editor.setOption(CustomAIPlugin, 'mode', null);
                // remove the AI prompt element
                editor.tf.removeNodes({
                    match: {
                        type: editor.getType('custom-ai'),
                    },
                });
            },
        },
    },
    options: {
        open: false as boolean,
        mode: null as 'prompt' | 'accept-reject' | null,
        status: 'idle' as 'idle' | 'thinking' | 'completed' | 'error',
        insertPath: null as number[] | null,
    },
});

export const CustomAIKit = CustomAIPlugin.withComponent(AIPromptElement);