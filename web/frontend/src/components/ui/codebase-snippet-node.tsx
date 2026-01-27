import type { PlateElementProps } from 'platejs/react';
import type { CodebaseSnippetElementType } from '@/components/editor/plugins/codebase-kit';
import { useQuery } from '@tanstack/react-query';
import { createHighlighter, type Highlighter } from 'shiki';
import { useEffect, useState, useRef } from 'react';
import { useTheme } from '@/components/theme-provider';
import { Copy, Settings, AlertTriangle, Check } from 'lucide-react';
import { FileSelector } from './file-selector';
import { useEditorRef } from 'platejs/react';
import { toast } from 'sonner';
import { getFileContents, getPrefix } from '@/api/codebase';
import { Spinner } from './spinner';

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
    const showFileSelector = element.showFileSelector;
    const [highlighter, setHighlighter] = useState<Highlighter | null>(null);
    const [highlightedCode, setHighlightedCode] = useState<string>('');
    const hasUpdatedLines = useRef(false);

    const prefixQuery = useQuery({
        queryKey: ["codebase", "prefix"],
        queryFn: () => getPrefix(),
        enabled: false,
        staleTime: Infinity,
    })

    // Include tracking params in the query
    // Note: contentHash is intentionally excluded from queryKey - it's only used for comparison
    // and changing it (e.g., when marking reviewed) shouldn't trigger a refetch
    const fileContents = useQuery({
        queryKey: ["codebase", "get-file-contents", element.filePath, element.lineStart, element.lineEnd, element.baseCommit],
        queryFn: () => getFileContents(element.filePath || '', {
            lineStart: element.lineStart,
            lineEnd: element.lineEnd,
            baseCommit: element.baseCommit,
            contentHash: element.contentHash,
        }),
        enabled: element.filePath !== undefined && element.filePath.length > 0,
    })

    // Reset hasUpdatedLines when file/lines change (user selected new snippet params)
    useEffect(() => {
        hasUpdatedLines.current = false;
    }, [element.filePath, element.lineStart, element.lineEnd]);

    // Update element when tracking info changes (e.g., line numbers shifted)
    useEffect(() => {
        if (!fileContents.data) return;
        if (hasUpdatedLines.current) return;

        const { newLineStart, newLineEnd, newBaseCommit, newContentHash, needsReview } = fileContents.data;

        // Check if we need to update the element
        const lineStartChanged = newLineStart !== undefined && String(newLineStart) !== element.lineStart;
        const lineEndChanged = newLineEnd !== undefined && String(newLineEnd) !== element.lineEnd;
        const commitChanged = newBaseCommit !== undefined && newBaseCommit !== element.baseCommit;
        const needsReviewChanged = needsReview !== undefined && String(needsReview) !== element.needsReview;

        if (lineStartChanged || lineEndChanged || commitChanged || needsReviewChanged) {
            hasUpdatedLines.current = true;
            const updates: Partial<CodebaseSnippetElementType> = {};

            if (lineStartChanged) updates.lineStart = String(newLineStart);
            if (lineEndChanged) updates.lineEnd = String(newLineEnd);
            if (commitChanged) updates.baseCommit = newBaseCommit;
            if (needsReviewChanged) updates.needsReview = String(needsReview);

            // Only update hash if this is a new snippet (no existing hash)
            if (!element.contentHash && newContentHash) {
                updates.contentHash = newContentHash;
            }

            editor.tf.setNodes(updates, { at: element });
        }
    }, [fileContents.data, element, editor])

    const language = getLanguageFromPath(element.filePath);

    useEffect(() => {
        if (highlighter) return;
        if (!language) return;
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
    }, [language, highlighter]);

    useEffect(() => {
        if (!highlighter || !fileContents.data) return;

        const highlightCode = async () => {
            if (!highlighter.getLoadedLanguages().includes(language)) {
                await highlighter.loadLanguage(language as Parameters<Highlighter['loadLanguage']>[0]);
            }

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
        }

        highlightCode();
    }, [highlighter, fileContents.data, language, theme, element.lineStart, element.lineEnd]);

    const handleCopy = () => {
        void navigator.clipboard.writeText(fileContents.data?.contents || '');
        toast.success('Copied to clipboard');
    }

    const handleMarkReviewed = () => {
        // Update the content hash to the current content's hash and clear the review flag
        if (fileContents.data?.newContentHash) {
            editor.tf.setNodes({
                contentHash: fileContents.data.newContentHash,
                needsReview: 'false',
            }, { at: element });
            toast.success('Snippet marked as reviewed');
        }
    }

    const needsReview = element.needsReview === 'true';

    return (
        <div contentEditable={false} {...attributes} className={`codebase-snippet my-4 rounded-lg border overflow-hidden ${needsReview ? 'border-yellow-500' : ''}`}>
            <div className="bg-muted px-4 py-2 border-b flex justify-between items-center">
                <div className='flex items-center gap-2'>
                    <a href={`${prefixQuery.data || 'vscode'}://file/${fileContents.data?.fullPath || ''}:${element.lineStart}`}>
                        <p className="text-sm font-medium text-muted-foreground">{element.filePath}</p>
                    </a>
                    <button
                        className='bg-transparent border-none p-0 m-0 cursor-pointer'
                        onClick={() => editor.tf.setNodes({ showFileSelector: true }, { at: element })}
                    >
                        <Settings className='size-4 text-muted-foreground' />
                    </button>
                    {needsReview && (
                        <div className="flex items-center gap-1 text-yellow-600 dark:text-yellow-500">
                            <AlertTriangle className="size-4" />
                            <span className="text-xs font-medium">Code changed - review needed</span>
                        </div>
                    )}
                </div>
                <div className="flex items-center gap-2">
                    {needsReview && (
                        <button
                            className='bg-transparent border-none p-0 m-0 cursor-pointer flex items-center gap-1 text-green-600 dark:text-green-500 hover:text-green-700 dark:hover:text-green-400'
                            onClick={handleMarkReviewed}
                            title="Mark as reviewed"
                        >
                            <Check className='size-4' />
                            <span className="text-xs font-medium">Mark Reviewed</span>
                        </button>
                    )}
                    <button className='bg-transparent border-none p-0 m-0 cursor-pointer' onClick={handleCopy}>
                        <Copy className='size-4 text-muted-foreground' />
                    </button>
                </div>
            </div>
            <div className="relative">
                {(fileContents.isLoading || (!fileContents.isLoading && !highlightedCode && element.filePath !== '')) ? (
                    <div className="p-4 text-sm text-muted-foreground">
                        <Spinner
                            className="size-4"
                        />
                    </div>
                ) : (<div
                    dangerouslySetInnerHTML={{ __html: highlightedCode }}
                />)}
                {(element.filePath === '' || fileContents.isError || fileContents.data?.contents === '') && (
                    <div className="p-4 text-sm text-muted-foreground">
                        <p>Error loading code</p>
                    </div>
                )}
            </div>
            <div className="bg-muted px-4 py-2 border-t flex justify-between items-center">
                <p className="text-sm font-medium text-muted-foreground">Line {element.lineStart} - {element.lineEnd}</p>
            </div>
            {children}
            <FileSelector
                open={showFileSelector || false}
                onClose={() => editor.tf.setNodes({ showFileSelector: false }, { at: element })}
                onSelect={(filePath, startLine, endLine) => {
                    // When user explicitly selects new file/lines, clear the old hash
                    // and reset needsReview. The new hash will be set by useEffect
                    // after the query with new params completes.
                    editor.tf.setNodes(
                        {
                            filePath,
                            lineStart: String(startLine),
                            lineEnd: String(endLine),
                            contentHash: '', // Clear - will be set fresh after fetch
                            baseCommit: '', // Clear - will be set fresh after fetch
                            needsReview: 'false',
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