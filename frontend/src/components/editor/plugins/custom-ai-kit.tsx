import { createPlatePlugin, type PlateEditor } from 'platejs/react';
import { KEYS, type TElement } from 'platejs';
import { AIPromptElement } from '@/components/ui/ai-node';

export const CustomAIPlugin = createPlatePlugin({
    key: 'custom-ai',
    api: {
        aiChat: {
            show(editor: PlateEditor) {
                console.log('show');
                editor.tf.insertNodes({
                    type: editor.getType('custom-ai'),
                    children: [{ text: '' }],
                }, { select: true });
                editor.setOption(CustomAIPlugin, 'open', true);
                editor.setOption(CustomAIPlugin, 'mode', 'prompt');
            },
            hide(editor: PlateEditor) {
                editor.setOption(CustomAIPlugin, 'open', false);
                editor.setOption(CustomAIPlugin, 'mode', null);
                editor.setOption(CustomAIPlugin, 'pendingNodes', null);
            },
            accept(editor: PlateEditor) {
                const pendingNodes = editor.getOption(CustomAIPlugin, 'pendingNodes');
                if (pendingNodes) {
                    // Nodes are already inserted, just mark them as accepted
                    editor.setOption(CustomAIPlugin, 'pendingNodes', null);
                    editor.setOption(CustomAIPlugin, 'insertPath', null);
                    editor.setOption(CustomAIPlugin, 'mode', null);
                    editor.setOption(CustomAIPlugin, 'open', false);

                    // Remove the accept/reject element
                    const aiElement = editor.api.node({
                        match: (n) => n.type === editor.getType(KEYS.slashInput) && editor.getOption(CustomAIPlugin, 'open'),
                    });
                    if (aiElement) {
                        editor.tf.removeNodes({ at: aiElement[1] });
                    }
                }
            },
            reject(editor: PlateEditor) {
                const pendingNodes = editor.getOption(CustomAIPlugin, 'pendingNodes');
                const insertPath = editor.getOption(CustomAIPlugin, 'insertPath');

                if (pendingNodes && insertPath && Array.isArray(insertPath) && insertPath.length > 0) {
                    // Remove the temporarily inserted nodes
                    editor.tf.withoutSaving(() => {
                        // Remove nodes in reverse order to maintain correct indices
                        for (let i = pendingNodes.length - 1; i >= 0; i--) {
                            const nodePath = [insertPath[0] + i];
                            try {
                                editor.tf.removeNodes({ at: nodePath });
                            } catch (error) {
                                console.warn('Failed to remove node at path:', nodePath, error);
                            }
                        }
                    });
                }

                editor.setOption(CustomAIPlugin, 'pendingNodes', null);
                editor.setOption(CustomAIPlugin, 'insertPath', null);
                editor.setOption(CustomAIPlugin, 'mode', null);
                editor.setOption(CustomAIPlugin, 'open', false);

                // Remove the accept/reject element
                const aiElement = editor.api.node({
                    match: (n) => n.type === editor.getType(KEYS.slashInput) && editor.getOption(CustomAIPlugin, 'open'),
                });
                if (aiElement) {
                    editor.tf.removeNodes({ at: aiElement[1] });
                }
            },
        },
    },
    options: {
        open: false as boolean,
        mode: null as 'prompt' | 'accept-reject' | null,
        status: 'idle' as 'idle' | 'thinking' | 'completed' | 'error',
        pendingNodes: null as TElement[] | null,
        insertPath: null as number[] | null,
    },
});

export const CustomAIKit = CustomAIPlugin.withComponent(AIPromptElement);