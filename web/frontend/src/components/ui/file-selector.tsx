import { useState, useMemo } from "react";
import { ChevronRight, ChevronDown, File, Folder, X } from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { getFolderContents, getFileContents } from '@/api/codebase';

interface FileNode {
    name: string;
    path: string;
    type: "file" | "directory";
    children?: FileNode[];
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
    const [expandedDirs, setExpandedDirs] = useState<Set<string>>(new Set());
    const [selectedFile, setSelectedFile] = useState<string>(currentFilePath || "");
    const [startLineInput, setStartLineInput] = useState<string>(
        currentStartLine || ""
    );
    const [endLineInput, setEndLineInput] = useState<string>(
        currentEndLine || ""
    );
    const [folderContents, setFolderContents] = useState<Map<string, FileNode[]>>(new Map());

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
        enabled: open && !!selectedFile,
    });

    const fileContent = fileContentQuery.data?.contents || "";
    const lineCount = fileContent.split("\n").length;

    // Convert inputs to numbers for calculations, with defaults
    const startLine = startLineInput === "" ? 1 : Math.max(1, parseInt(startLineInput) || 1);
    const endLine = endLineInput === ""
        ? (fileContentQuery.data && lineCount > 0 ? Math.min(50, lineCount) : 1)
        : Math.min(lineCount, Math.max(startLine, parseInt(endLineInput) || lineCount));

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

    const handleSelectFile = (filePath: string) => {
        setSelectedFile(filePath);
        setStartLineInput("");
        setEndLineInput("");
        fileContentQuery.refetch();
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
                            <div
                                className={cn(
                                    "flex items-center gap-1 px-2 py-1.5 hover:bg-muted transition-colors cursor-pointer rounded text-sm",
                                    selectedFile === node.path && node.type === "file"
                                        ? "bg-primary/10"
                                        : ""
                                )}
                                style={{ paddingLeft: `${depth * 16 + 8}px` }}
                            >
                                {node.type === "directory" ? (
                                    <>
                                        <button
                                            onClick={() => toggleExpanded(node.path)}
                                            className="flex items-center justify-center w-4 h-4 p-0"
                                            disabled={isLoading}
                                        >
                                            {isLoading ? (
                                                <div className="w-4 h-4 border-2 border-primary border-t-transparent rounded-full animate-spin" />
                                            ) : expandedDirs.has(node.path) ? (
                                                <ChevronDown className="w-4 h-4" />
                                            ) : (
                                                <ChevronRight className="w-4 h-4" />
                                            )}
                                        </button>
                                        <Folder className="w-4 h-4 text-blue-500 flex-shrink-0" />
                                        <span className="text-foreground">{node.name}</span>
                                    </>
                                ) : (
                                    <>
                                        <div className="w-4" />
                                        <File className="w-4 h-4 text-muted-foreground flex-shrink-0" />
                                        <button
                                            onClick={() => handleSelectFile(node.path)}
                                            className="text-foreground hover:text-primary"
                                        >
                                            {node.name}
                                        </button>
                                    </>
                                )}
                            </div>
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
            <div className="relative z-50 w-full max-w-4xl min-h-[80vh] max-h-[calc(100vh-2rem)] mx-4 bg-background rounded-lg shadow-xl flex flex-col overflow-hidden border">
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
                                        <div className="bg-muted rounded border p-2 overflow-y-auto absolute inset-0 text-xs font-mono">
                                            {fileContentQuery.isLoading ? (
                                                <p className="text-muted-foreground">Loading...</p>
                                            ) : (
                                                fileContent
                                                    .split("\n")
                                                    .slice(startLine - 1, endLine)
                                                    .map((line, idx) => (
                                                        <div
                                                            key={idx}
                                                            className="flex gap-2 text-foreground"
                                                        >
                                                            <span className="text-muted-foreground w-8 text-right flex-shrink-0">
                                                                {startLine + idx}
                                                            </span>
                                                            <span>{line}</span>
                                                        </div>
                                                    ))
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

