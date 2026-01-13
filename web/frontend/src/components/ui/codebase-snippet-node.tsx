import type { PlateElementProps } from 'platejs/react';
import type { CodebaseSnippetElementType } from '@/components/editor/plugins/codebase-kit';
import { useQuery } from '@tanstack/react-query';
import { createHighlighter, type Highlighter } from 'shiki';
import { useEffect, useState } from 'react';
import { useTheme } from '@/components/theme-provider';
import { Copy, Settings } from 'lucide-react';
import { FileSelector } from './file-selector';
import { useEditorRef } from 'platejs/react';
import { toast } from 'sonner';
import { getFileContents } from '@/api/codebase';

// Singleton highlighter cache
let highlighterPromise: Promise<Highlighter> | null = null;
const loadedLangs = new Set<string>();

async function getHighlighter(lang: string): Promise<Highlighter> {
    if (!highlighterPromise) {
        highlighterPromise = createHighlighter({
            themes: ['github-dark', 'github-light'],
            langs: [lang, 'text'],
        });
        loadedLangs.add(lang);
        loadedLangs.add('text');
    }

    const highlighter = await highlighterPromise;

    if (!loadedLangs.has(lang)) {
        await highlighter.loadLanguage(lang as Parameters<Highlighter['loadLanguage']>[0]);
        loadedLangs.add(lang);
    }

    return highlighter;
}

export function CodebaseSnippetElement({ attributes, children, element }: PlateElementProps<CodebaseSnippetElementType>) {
    const { theme } = useTheme();
    const editor = useEditorRef();
    const [highlighter, setHighlighter] = useState<Highlighter | null>(null);
    const [highlightedCode, setHighlightedCode] = useState<string>('');
    const [fileSelectorOpen, setFileSelectorOpen] = useState(false);

    const fileContents = useQuery({
        queryKey: ["codebase", "get-file-contents", element.filePath],
        queryFn: () => getFileContents(element.filePath || ''),
        enabled: !!element.filePath,
    })

    const language = getLanguageFromPath(element.filePath);

    useEffect(() => {
        let mounted = true;

        getHighlighter(language).then((h) => {
            if (mounted) {
                setHighlighter(h);
            }
        }).catch((error) => {
            console.error('Failed to get highlighter:', error);
        });

        return () => {
            mounted = false;
        };
    }, [language]);

    useEffect(() => {
        if (!highlighter || !fileContents.data) return;

        const highlightCode = async () => {
            const code = fileContents.data?.contents || '';
            const startLine = element.lineStart ? parseInt(element.lineStart) : 1;
            let endLine: number | undefined = undefined;
            if (element.lineEnd) {
                endLine = parseInt(element.lineEnd);
            } else {
                // If lineEnd is not specified, use the total number of lines as the maximum
                endLine = code.split('\n').length;
            }

            let codeToHighlight = code;
            let actualStartLine = startLine;
            if (startLine !== undefined && endLine !== undefined) {
                const lines = code.split('\n');
                codeToHighlight = lines.slice(startLine - 1, endLine).join('\n');
                actualStartLine = startLine;
            } else if (startLine !== undefined) {
                const lines = code.split('\n');
                codeToHighlight = lines.slice(startLine - 1).join('\n');
                actualStartLine = startLine;
            }

            try {
                const html = highlighter.codeToHtml(codeToHighlight, {
                    lang: language,
                    theme: theme === 'dark' ? 'github-dark' : 'github-light',
                });

                // Extract the inner content from Shiki's HTML (it wraps in pre>code)
                const tempDiv = document.createElement('div');
                tempDiv.innerHTML = html;
                const codeElement = tempDiv.querySelector('pre code') || tempDiv.querySelector('code');
                const codeContent = codeElement ? codeElement.innerHTML : html;

                // Split code into lines
                const lines = codeToHighlight.split('\n');
                const highlightedLines = codeContent.split('\n');

                // Create line-by-line structure with numbers
                const lineItems = lines.map((_, index) => {
                    const lineNumber = actualStartLine + index;
                    const highlightedLine = highlightedLines[index] || '';
                    return `<div class="flex gap-4 hover:bg-muted/50 transition-colors"><span class="inline-block w-10 text-right text-muted-foreground select-none flex-shrink-0">${lineNumber}</span><code class="flex-1">${highlightedLine || '\n'}</code></div>`;
                }).join('');

                // Wrap the highlighted code with line numbers
                const codeWithLineNumbers = `<div class="overflow-x-auto"><div class="p-4 text-sm leading-normal font-mono m-0">${lineItems}</div></div>`;

                setHighlightedCode(codeWithLineNumbers);
            } catch (error) {
                console.error('Failed to highlight code:', error);
                const lines = codeToHighlight.split('\n');
                const lineItems = lines.map((line, index) => {
                    const lineNumber = actualStartLine + index;
                    return `<div class="flex gap-4 hover:bg-muted/50 transition-colors"><span class="inline-block w-10 text-right text-muted-foreground select-none flex-shrink-0">${lineNumber}</span><code class="flex-1">${line || '\n'}</code></div>`;
                }).join('');

                const fallbackHtml = `<div class="overflow-x-auto"><pre class="p-4 text-sm leading-normal font-mono m-0">${lineItems}</pre></div>`;
                setHighlightedCode(fallbackHtml);
            }
        };

        highlightCode();
    }, [highlighter, fileContents.data, language, theme, element.lineStart, element.lineEnd]);

    const handleCopy = () => {
        void navigator.clipboard.writeText(fileContents.data?.contents || '');
        toast.success('Copied to clipboard');
    }

    return (
        <div contentEditable={false} {...attributes} className="codebase-snippet my-4 rounded-lg border overflow-hidden">
            <div className="bg-muted px-4 py-2 border-b flex justify-between items-center">
                <div className='flex items-center gap-2'>
                    <a href={`vscode://file/${fileContents.data?.fullPath || ''}:${element.lineStart}`}>
                        <p className="text-sm font-medium text-muted-foreground">{element.filePath}</p>
                    </a>
                    <button
                        className='bg-transparent border-none p-0 m-0 cursor-pointer'
                        onClick={() => setFileSelectorOpen(true)}
                    >
                        <Settings className='size-4 text-muted-foreground' />
                    </button>
                </div>
                <button className='bg-transparent border-none p-0 m-0 cursor-pointer' onClick={handleCopy}>
                    <Copy className='size-4 text-muted-foreground' />
                </button>
            </div>
            <div className="relative">
                {fileContents.isLoading ? (
                    <div className="p-4 text-sm text-muted-foreground">Loading code...</div>
                ) : highlightedCode ? (
                    <div
                        dangerouslySetInnerHTML={{ __html: highlightedCode }}
                    />
                ) : (
                    <div className="p-4 text-sm text-muted-foreground">No code to display</div>
                )}
            </div>
            <div className="bg-muted px-4 py-2 border-t flex justify-between items-center">
                <p className="text-sm font-medium text-muted-foreground">Line {element.lineStart} - {element.lineEnd}</p>
            </div>
            {children}
            <FileSelector
                open={fileSelectorOpen}
                onClose={() => setFileSelectorOpen(false)}
                onSelect={(filePath, startLine, endLine) => {
                    editor.tf.setNodes(
                        {
                            filePath,
                            lineStart: String(startLine),
                            lineEnd: String(endLine),
                        },
                        { at: element }
                    );
                }}
                currentFilePath={element.filePath}
                currentStartLine={element.lineStart}
                currentEndLine={element.lineEnd}
            />
        </div>
    )
}

function getLanguageFromPath(path?: string) {
    if (!path) return 'text';

    const ext = path.split('.').pop();

    switch (ext) {
        case 'ts':
            return 'ts';
        case 'tsx':
            return 'tsx';
        case 'jsx':
            return 'jsx';
        case 'js':
            return 'javascript';
        case 'json':
            return 'json';
        case 'go':
            return 'go';
        case 'java':
            return 'java';
        case 'kt':
            return 'kotlin';
        case 'php':
            return 'php';
        case 'rb':
            return 'ruby';
        case 'rs':
            return 'rust';
        case 'scala':
            return 'scala';
        case 'swift':
            return 'swift';
        case 'vb':
            return 'vbnet';
        case 'cs':
            return 'csharp';
        case 'py':
            return 'python';
        case 'md':
            return 'markdown';
        case 'sh':
            return 'shell';
        case 'css':
            return 'css';
        case 'html':
            return 'html';
        case 'xml':
            return 'xml';
        case 'yaml':
            return 'yaml';
        default:
            return 'text';
    }
}