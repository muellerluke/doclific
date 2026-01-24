import { useState, useMemo, useEffect, useRef } from "react";
import { ChevronRight, ChevronDown, File, Folder, X } from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { getFolderContents, getFileContents } from '@/api/codebase';
import { createHighlighter, type Highlighter } from 'shiki';
import { useTheme } from '@/components/theme-provider';
import { Spinner } from "./spinner";

interface FileNode {
    name: string;
    path: string;
    type: "file" | "directory";
    children?: FileNode[];
}

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

interface FileSelectorProps {
    open: boolean;
    onClose: () => void;
    onSelect: (filePath: string, startLine: number, endLine: number) => void;
    currentFilePath?: string;
    currentStartLine?: string;
    currentEndLine?: string;
}

export function FileSelector({
    open,
    onClose,
    onSelect,
    currentFilePath,
    currentStartLine,
    currentEndLine,
}: FileSelectorProps) {
    const queryClient = useQueryClient();
    const { theme } = useTheme();
    const [expandedDirs, setExpandedDirs] = useState<Set<string>>(new Set());
    const [selectedFile, setSelectedFile] = useState<string>(currentFilePath || "");
    const [startLineInput, setStartLineInput] = useState<string>(
        currentStartLine || ""
    );
    const [endLineInput, setEndLineInput] = useState<string>(
        currentEndLine || ""
    );
    const [folderContents, setFolderContents] = useState<Map<string, FileNode[]>>(new Map());
    const lastProcessedFileRef = useRef<string>("");
    const [highlighter, setHighlighter] = useState<Highlighter | null>(null);
    const [highlightedCode, setHighlightedCode] = useState<string>('');
    const [loadedLanguage, setLoadedLanguage] = useState<string>("");
    const [isHighlighterLoading, setIsHighlighterLoading] = useState<boolean>(false);

    const rootFolderQuery = useQuery({
        queryKey: ["codebase", "get-folder-contents", ""],
        queryFn: () => getFolderContents(""),
        enabled: open,
    });

    // Merge all folder contents for rendering (includes root folder)
    const allFolderContents = useMemo(() => {
        const merged = new Map(folderContents);
        if (rootFolderQuery.data) {
            merged.set("", rootFolderQuery.data);
        }
        return merged;
    }, [folderContents, rootFolderQuery.data]);

    const fileContentQuery = useQuery({
        queryKey: ["codebase", "get-file-contents", selectedFile],
        queryFn: () => getFileContents(selectedFile || ''),
        enabled: open && !!selectedFile && selectedFile.length > 0,
    });

    const fileContent = fileContentQuery.data?.contents || "";
    const lineCount = fileContent.split("\n").length;
    const language = getLanguageFromPath(selectedFile);
    const isPreviewReady = !fileContentQuery.isLoading
        && !isHighlighterLoading
        && !!highlighter
        && loadedLanguage === language
        && (fileContentQuery.data?.contents && highlightedCode !== "");

    // Load highlighter for the current language
    useEffect(() => {
        if (!selectedFile) return;

        let mounted = true;
        setIsHighlighterLoading(true);
        setHighlightedCode("");

        getHighlighter(language).then((h) => {
            if (mounted) {
                setHighlighter(h);
                setLoadedLanguage(language);
                setIsHighlighterLoading(false);
            }
        }).catch((error) => {
            console.error('Failed to get highlighter:', error);
            if (mounted) {
                setIsHighlighterLoading(false);
            }
        });

        return () => {
            mounted = false;
        };
    }, [language, selectedFile]);

    // Convert inputs to numbers for calculations, with defaults
    const startLine = startLineInput === "" ? 1 : Math.max(1, parseInt(startLineInput) || 1);
    const endLine = endLineInput === ""
        ? (fileContentQuery.data && lineCount > 0 ? lineCount : 1)
        : Math.min(lineCount, Math.max(startLine, parseInt(endLineInput) || lineCount));

    // Highlight code when highlighter, file content, or line range changes
    useEffect(() => {
        if (!highlighter || !fileContentQuery.data || !fileContent) return;
        if (loadedLanguage !== language) return;

        const highlightCode = async () => {
            const codeToHighlight = fileContent
                .split("\n")
                .slice(startLine - 1, endLine)
                .join('\n');

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
                    const lineNumber = startLine + index;
                    const highlightedLine = highlightedLines[index] || '';
                    return `<div class="flex gap-2 hover:bg-muted/50 transition-colors"><span class="text-muted-foreground w-8 text-right flex-shrink-0 select-none">${lineNumber}</span><code class="flex-1">${highlightedLine || '\n'}</code></div>`;
                }).join('');

                // Wrap the highlighted code with line numbers
                const codeWithLineNumbers = `<div class="overflow-x-auto"><div class="p-2 text-xs leading-normal font-mono m-0">${lineItems}</div></div>`;

                setHighlightedCode(codeWithLineNumbers);
            } catch (error) {
                console.error('Failed to highlight code:', error);
                // Fallback to plain text with line numbers
                const lines = codeToHighlight.split('\n');
                const lineItems = lines.map((line, index) => {
                    const lineNumber = startLine + index;
                    return `<div class="flex gap-2 hover:bg-muted/50 transition-colors"><span class="text-muted-foreground w-8 text-right flex-shrink-0 select-none">${lineNumber}</span><code class="flex-1">${line || '\n'}</code></div>`;
                }).join('');

                const fallbackHtml = `<div class="overflow-x-auto"><div class="p-2 text-xs leading-normal font-mono m-0">${lineItems}</div></div>`;
                setHighlightedCode(fallbackHtml);
            }
        };

        const timeout = setTimeout(() => {
            highlightCode();
        }, 200);

        return () => clearTimeout(timeout);
    }, [highlighter, fileContentQuery.data, fileContent, startLine, endLine, language, theme, loadedLanguage]);

    const toggleExpanded = async (path: string) => {
        const newExpanded = new Set(expandedDirs);
        if (newExpanded.has(path)) {
            newExpanded.delete(path);
        } else {
            newExpanded.add(path);
            // Fetch folder contents if not already loaded
            if (!folderContents.has(path)) {
                try {
                    const data = await queryClient.fetchQuery({
                        queryKey: ["codebase", "get-folder-contents", path],
                        queryFn: () => getFolderContents(path),
                    });
                    setFolderContents((prev) => {
                        const newMap = new Map(prev);
                        newMap.set(path, data || []);
                        return newMap;
                    });
                } catch (error) {
                    console.error("Failed to fetch folder contents:", error);
                }
            }
        }
        setExpandedDirs(newExpanded);
    };

    const handleSelectFile = async (filePath: string) => {
        setSelectedFile(filePath);
        setStartLineInput("");
        setEndLineInput("");
        lastProcessedFileRef.current = ""; // Reset so useEffect can process the new file
        const result = await fileContentQuery.refetch();
        if (result.data?.contents) {
            const lines = result.data.contents.split("\n").length;
            if (lines > 0) {
                setEndLineInput(String(lines));
                lastProcessedFileRef.current = filePath;
            }
        }
    };

    const handleConfirm = () => {
        if (selectedFile) {
            onSelect(selectedFile, startLine, endLine);
            onClose();
        }
    };

    const renderFileTree = (nodes: FileNode[], depth = 0) => {
        return (
            <div>
                {nodes.map((node) => {
                    const children = node.type === "directory" ? allFolderContents.get(node.path) : undefined;
                    const isLoading = node.type === "directory" && expandedDirs.has(node.path) && !allFolderContents.has(node.path);

                    return (
                        <div key={node.path}>
                            <button
                                className={cn(
                                    "flex items-center w-full gap-1 px-2 py-1.5 hover:bg-muted transition-colors cursor-pointer rounded text-sm",
                                    selectedFile === node.path && node.type === "file"
                                        ? "bg-primary/10"
                                        : ""
                                )}
                                style={{ paddingLeft: `${depth * 16 + 8}px` }}
                                onClick={() => node.type === "directory" ? toggleExpanded(node.path) : handleSelectFile(node.path)}
                            >
                                {node.type === "directory" ? (
                                    <>
                                        <div
                                            className="flex items-center justify-center w-4 h-4 p-0"
                                        >
                                            {isLoading ? (
                                                <div className="w-4 h-4 border-2 border-primary border-t-transparent rounded-full animate-spin" />
                                            ) : expandedDirs.has(node.path) ? (
                                                <ChevronDown className="w-4 h-4" />
                                            ) : (
                                                <ChevronRight className="w-4 h-4" />
                                            )}
                                        </div>
                                        <Folder className="w-4 h-4 text-blue-500 flex-shrink-0" />
                                        <span className="text-foreground">{node.name}</span>
                                    </>
                                ) : (
                                    <>
                                        <div className="w-4" />
                                        <File className="w-4 h-4 text-muted-foreground flex-shrink-0" />
                                        <span
                                            className="text-foreground hover:text-primary"
                                        >
                                            {node.name}
                                        </span>
                                    </>
                                )}
                            </button>
                            {node.type === "directory" &&
                                expandedDirs.has(node.path) &&
                                children && (
                                    <>{renderFileTree(children, depth + 1)}</>
                                )}
                        </div>
                    );
                })}
            </div>
        );
    };

    if (!open) return null;

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center">
            {/* Backdrop */}
            <div className="absolute inset-0 bg-black/50" onClick={onClose} />

            {/* Modal */}
            <div className="relative z-50 w-full max-w-6xl min-h-[80vh] max-h-[calc(100vh-2rem)] mx-4 bg-background rounded-lg shadow-xl flex flex-col overflow-hidden border">
                {/* Header */}
                <div className="flex items-center justify-between px-6 py-4 border-b">
                    <div>
                        <h2 className="text-lg font-semibold">Select File and Lines</h2>
                        <p className="text-sm text-muted-foreground">
                            Choose a file and specify the line range you want to display
                        </p>
                    </div>
                    <button
                        onClick={onClose}
                        className="p-1 hover:bg-muted rounded"
                    >
                        <X className="w-6 h-6" />
                    </button>
                </div>

                {/* Content */}
                <div className="flex gap-4 flex-1 overflow-hidden p-6">
                    {/* File browser */}
                    <div className="flex-1 border rounded-lg overflow-y-auto bg-muted/50 p-2">
                        {rootFolderQuery.isLoading ? (
                            <div className="p-4 text-sm text-muted-foreground">
                                Loading files...
                            </div>
                        ) : (
                            renderFileTree(allFolderContents.get("") || [])
                        )}
                    </div>

                    {/* Preview and line selection */}
                    <div className="flex-1 flex flex-col gap-4">
                        {selectedFile ? (
                            <>
                                <div>
                                    <p className="text-sm font-semibold mb-2">
                                        Selected:{" "}
                                        <span className="text-primary">{selectedFile}</span>
                                    </p>
                                    <p className="text-xs text-muted-foreground">
                                        Total lines: {lineCount}
                                    </p>
                                </div>

                                {/* Line range inputs */}
                                <div className="flex gap-4">
                                    <div className="flex-1">
                                        <label className="text-xs font-medium text-muted-foreground block mb-1">
                                            Start Line
                                        </label>
                                        <input
                                            type="text"
                                            inputMode="numeric"
                                            value={startLineInput}
                                            onChange={(e) => {
                                                const value = e.target.value;
                                                // Allow empty string or valid numbers
                                                if (value === "" || /^\d+$/.test(value)) {
                                                    setStartLineInput(value);
                                                }
                                            }}
                                            onBlur={(e) => {
                                                // Validate on blur - set to 1 if empty or invalid
                                                const num = parseInt(e.target.value);
                                                if (isNaN(num) || num < 1) {
                                                    setStartLineInput("");
                                                } else if (num > lineCount) {
                                                    setStartLineInput(String(lineCount));
                                                }
                                            }}
                                            className="w-full px-2 py-1 border rounded text-sm bg-background text-foreground"
                                            placeholder="1"
                                        />
                                    </div>
                                    <div className="flex-1">
                                        <label className="text-xs font-medium text-muted-foreground block mb-1">
                                            End Line
                                        </label>
                                        <input
                                            type="text"
                                            inputMode="numeric"
                                            value={endLineInput}
                                            onChange={(e) => {
                                                const value = e.target.value;
                                                // Allow empty string or valid numbers
                                                if (value === "" || /^\d+$/.test(value)) {
                                                    setEndLineInput(value);
                                                }
                                            }}
                                            onBlur={(e) => {
                                                // Validate on blur
                                                const num = parseInt(e.target.value);
                                                if (isNaN(num) || num < startLine) {
                                                    setEndLineInput("");
                                                } else if (num > lineCount) {
                                                    setEndLineInput(String(lineCount));
                                                }
                                            }}
                                            className="w-full px-2 py-1 border rounded text-sm bg-background text-foreground"
                                            placeholder={String(lineCount)}
                                        />
                                    </div>
                                </div>

                                {/* Preview */}
                                <div className="flex-1 flex flex-col">
                                    <p className="text-xs font-medium text-muted-foreground mb-1">
                                        Preview
                                    </p>
                                    <div className="flex-1 relative">
                                        <div className="bg-muted rounded border overflow-y-auto absolute inset-0">
                                            {!isPreviewReady ? (
                                                <div className="w-full py-4 flex items-center justify-center">
                                                    <Spinner
                                                        className="w-4 h-4"
                                                    />
                                                </div>
                                            ) : highlightedCode ? (
                                                <div
                                                    dangerouslySetInnerHTML={{ __html: highlightedCode }}
                                                />
                                            ) : (
                                                <p className="text-muted-foreground p-2">No code to display</p>
                                            )}
                                        </div>
                                    </div>
                                </div>
                            </>
                        ) : (
                            <div className="flex items-center justify-center h-full text-muted-foreground">
                                <p>Select a file to begin</p>
                            </div>
                        )}
                    </div>
                </div>

                {/* Footer */}
                <div className="flex justify-end gap-2 px-6 py-4 border-t bg-muted/50">
                    <Button variant="outline" onClick={onClose}>
                        Cancel
                    </Button>
                    <Button onClick={handleConfirm} disabled={!selectedFile}>
                        Insert Code
                    </Button>
                </div>
            </div>
        </div>
    );
}

