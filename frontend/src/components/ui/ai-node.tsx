import { usePluginOption, useEditorRef, PlateElement, type PlateElementProps } from 'platejs/react';
import { CustomAIPlugin } from '../editor/plugins/custom-ai-kit';
import {
    InlineCombobox,
    InlineComboboxInput,
    InlineComboboxEmpty,
    InlineComboboxContent,
    InlineComboboxItem,
    InlineComboboxGroup,
} from './inline-combobox';
import { type TComboboxInputElement } from 'platejs';
import { Check, X, Loader2 } from 'lucide-react';
import { useState } from 'react';
import { orpc } from '@/lib/orpc';
import type { TElement } from 'platejs';

export function AIPromptElement(props: PlateElementProps<TComboboxInputElement>) {
    console.log('AIPromptElement');
    const editor = useEditorRef();
    const open = usePluginOption(CustomAIPlugin, 'open');
    const mode = usePluginOption(CustomAIPlugin, 'mode');
    const [prompt, setPrompt] = useState('');
    const [isSubmitting, setIsSubmitting] = useState(false);

    const handleSubmit = async (promptValue: string) => {
        if (!promptValue.trim() || isSubmitting) return;

        setIsSubmitting(true);
        editor.setOption(CustomAIPlugin, 'status', 'thinking');

        try {
            const nodes = await orpc.ai.generateRichText({ prompt: promptValue.trim() });

            // Get the current block path where cursor is
            const currentBlock = editor.api.block();
            if (!currentBlock) {
                throw new Error('No current block found');
            }

            const currentPath = currentBlock[1];
            // Store the path where we'll insert (after current block)
            const insertPath = [currentPath[0] + 1];
            editor.setOption(CustomAIPlugin, 'insertPath', insertPath);

            // Temporarily insert nodes after the current block
            editor.tf.withoutSaving(() => {
                editor.tf.insertNodes(nodes as TElement[], {
                    at: insertPath,
                });
            });

            // Store pending nodes and switch to accept/reject mode
            editor.setOption(CustomAIPlugin, 'pendingNodes', nodes);
            editor.setOption(CustomAIPlugin, 'mode', 'accept-reject');
            editor.setOption(CustomAIPlugin, 'status', 'completed');
            setPrompt('');
        } catch (error) {
            console.error('AI generation error:', error);
            editor.setOption(CustomAIPlugin, 'status', 'error');
        } finally {
            setIsSubmitting(false);
        }
    };

    console.log('open', open);
    console.log('mode', mode);

    if (!open || mode !== 'prompt') return null;

    return (
        <PlateElement {...props} as="span">
            <InlineCombobox
                element={props.element}
                trigger="/"
                value={prompt}
                setValue={setPrompt}
            >
                <InlineComboboxInput
                    onKeyDown={(e) => {
                        if (e.key === 'Enter' && !e.shiftKey) {
                            e.preventDefault();
                            handleSubmit(prompt);
                        }
                        if (e.key === 'Escape') {
                            editor.getApi(CustomAIPlugin).aiChat.hide(editor);
                        }
                    }}
                />
                <InlineComboboxContent>
                    {isSubmitting ? (
                        <InlineComboboxGroup>
                            <InlineComboboxItem value="thinking" disabled>
                                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                                Thinking...
                            </InlineComboboxItem>
                        </InlineComboboxGroup>
                    ) : (
                        <InlineComboboxEmpty>
                            Press Enter to generate, Esc to cancel
                        </InlineComboboxEmpty>
                    )}
                </InlineComboboxContent>
            </InlineCombobox>
            {props.children}
        </PlateElement>
    );
}

export function AIAcceptRejectElement(props: PlateElementProps<TComboboxInputElement>) {
    const editor = useEditorRef();
    const open = usePluginOption(CustomAIPlugin, 'open');
    const mode = usePluginOption(CustomAIPlugin, 'mode');

    if (!open || mode !== 'accept-reject') return null;

    return (
        <PlateElement {...props} as="span">
            <InlineCombobox element={props.element} trigger="/">
                <InlineComboboxInput />
                <InlineComboboxContent>
                    <InlineComboboxGroup>
                        <InlineComboboxItem
                            value="accept"
                            onClick={() => editor.getApi(CustomAIPlugin).aiChat.accept(editor)}
                        >
                            <Check className="mr-2 h-4 w-4 text-green-600" />
                            Accept
                        </InlineComboboxItem>
                        <InlineComboboxItem
                            value="reject"
                            onClick={() => editor.getApi(CustomAIPlugin).aiChat.reject(editor)}
                        >
                            <X className="mr-2 h-4 w-4 text-red-600" />
                            Reject
                        </InlineComboboxItem>
                    </InlineComboboxGroup>
                </InlineComboboxContent>
            </InlineCombobox>
            {props.children}
        </PlateElement>
    );
}
