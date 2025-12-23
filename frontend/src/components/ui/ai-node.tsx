import { usePluginOption, useEditorRef, PlateElement, type PlateElementProps } from 'platejs/react';
import { CustomAIPlugin } from '../editor/plugins/custom-ai-kit';
import {
    type TComboboxInputElement
} from 'platejs';
import { Sparkle } from 'lucide-react';
import { useState, useRef, useEffect } from 'react';
import { orpc } from '@/lib/orpc';
import { InputGroup, InputGroupAddon, InputGroupInput } from "@/components/ui/input-group"
import { Spinner } from './spinner';
import { MarkdownPlugin } from '@platejs/markdown';

export function AIPromptElement(props: PlateElementProps<TComboboxInputElement>) {
    const editor = useEditorRef();
    const open = usePluginOption(CustomAIPlugin, 'open');
    const mode = usePluginOption(CustomAIPlugin, 'mode');
    const [prompt, setPrompt] = useState('');
    const [isSubmitting, setIsSubmitting] = useState(false);
    const inputRef = useRef<HTMLInputElement>(null);

    // Autofocus input when component becomes visible
    useEffect(() => {
        if (open && mode === 'prompt' && inputRef.current) {
            setTimeout(() => {
                inputRef.current?.focus();
            }, 0);
        }
    }, [open, mode]);

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

            editor.tf.insertNodes(nodes, {
                at: insertPath,
            });

            try {
                const serialized = editor.getApi(MarkdownPlugin).markdown.serialize();
                console.log('Serialized after insertion:', serialized);
            } catch (error) {
                console.error('Serialization error:', error);
            }

            const nodeAtPath = editor.api.node({ at: insertPath });
            console.log('Node at insert path:', nodeAtPath);

            // Store pending nodes and switch to accept/reject mode
            editor.setOption(CustomAIPlugin, 'mode', null);
            editor.setOption(CustomAIPlugin, 'status', 'completed');
            setPrompt('');
        } catch (error) {
            console.error('AI generation error:', error);
            editor.setOption(CustomAIPlugin, 'status', 'error');
        } finally {
            setIsSubmitting(false);
        }
    };

    if (!open || mode !== 'prompt') return null;

    return (
        <PlateElement {...props} as="span">
            <InputGroup>
                <InputGroupInput
                    ref={inputRef}
                    placeholder="Ask me to document anything. Press Enter to submit. Press Escape to cancel."
                    value={prompt}
                    onChange={(e) => setPrompt(e.target.value)}
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
                <InputGroupAddon>
                    <Sparkle className="size-4" />
                </InputGroupAddon>
                {isSubmitting &&
                    <InputGroupAddon align="inline-end">
                        <Spinner />
                    </InputGroupAddon>
                }
            </InputGroup>
            {props.children}
        </PlateElement>
    );
}
