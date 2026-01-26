import { ChevronRight, EllipsisVertical, FileIcon, Plus, UserCircle, Search, X } from "lucide-react";
import * as Icons from "lucide-react";
import {
    Sidebar,
    SidebarContent,
    SidebarFooter,
    SidebarGroup,
    SidebarGroupContent,
    SidebarGroupLabel,
    SidebarMenu,
    SidebarMenuButton,
    SidebarMenuItem,
    SidebarHeader,
    SidebarMenuSub,
    SidebarMenuSubItem,
    SidebarMenuSubButton,
} from "@/components/ui/sidebar"
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query"
import { useState, useRef, useEffect } from "react"
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuLabel, DropdownMenuSeparator, DropdownMenuTrigger, DropdownMenuGroup } from "@/components/ui/dropdown-menu"
import { Avatar, AvatarFallback } from "@/components/ui/avatar"
import { useSidebar } from "@/components/ui/sidebar"
import type { FolderStructure } from "@/types/docs"
import { DynamicIcon, type LucideIconName } from "./ui/dynamic-icon"
import { useNavigate, useLocation } from "react-router"
import {
    Dialog,
    DialogContent,
    DialogFooter,
    DialogHeader,
    DialogTitle,
    DialogTrigger,
    DialogDescription,
} from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import React from "react"
import {
    AlertDialog,
    AlertDialogContent,
    AlertDialogHeader,
    AlertDialogTitle,
    AlertDialogTrigger,
    AlertDialogDescription,
    AlertDialogFooter,
    AlertDialogCancel,
    AlertDialogAction,
} from "@/components/ui/alert-dialog";
import { toast } from "sonner";
import { createDoc, deleteDoc, getDocs, updateDocOrder, type DocOrderNode } from "@/api/docs";
import { getRepoInfo } from "@/api/git";
import { queryClient } from "../main"

function CreateDocDialog({
    parentPath,
    isNested,
}: {
    parentPath: string
    isNested: boolean
}) {
    const [open, setOpen] = useState(false)
    const [title, setTitle] = useState("")
    const [selectedIcon, setSelectedIcon] = useState<string>("")
    const [iconSearch, setIconSearch] = useState("")
    const [showIconPicker, setShowIconPicker] = useState(false)
    const iconPickerRef = useRef<HTMLDivElement>(null)
    const iconSearchInputRef = useRef<HTMLInputElement>(null)
    const queryClient = useQueryClient()
    const navigate = useNavigate()
    // Close icon picker when clicking outside
    useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
            if (iconPickerRef.current && !iconPickerRef.current.contains(event.target as Node)) {
                setShowIconPicker(false)
            }
        }
        if (showIconPicker) {
            document.addEventListener("mousedown", handleClickOutside)
            return () => document.removeEventListener("mousedown", handleClickOutside)
        }
    }, [showIconPicker])

    // Autofocus input when icon picker opens
    useEffect(() => {
        if (showIconPicker && iconSearchInputRef.current) {
            setTimeout(() => {
                iconSearchInputRef.current?.focus()
            }, 0)
        }
    }, [showIconPicker])

    const createDocMutation = useMutation({
        mutationFn: createDoc,
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ["docs", "get-docs"] })
            setOpen(false)
            setTitle("")
            setSelectedIcon("")
            setIconSearch("")
            setShowIconPicker(false)
        },
    })

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault()
        const { url } = await createDocMutation.mutateAsync({
            filePath: parentPath,
            title,
            icon: selectedIcon || undefined,
        })
        navigate(url)
    }

    const iconNames = Object.keys(Icons).filter((iconName) => iconName.endsWith("Icon") && iconName !== "createLucideIcon").map((iconName) => iconName.replace("Icon", ""))

    const IconComponent = selectedIcon ? <DynamicIcon name={selectedIcon as LucideIconName} /> : null

    return (
        <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger asChild>
                {isNested ? (
                    <SidebarMenuSubButton className="text-muted-foreground hover:text-foreground cursor-pointer">
                        <Plus className="size-4 !stroke-current" />
                        <span className="truncate">New doc</span>
                    </SidebarMenuSubButton>
                ) : (
                    <SidebarMenuButton className="text-muted-foreground stroke-muted-foreground hover:text-foreground hover:stroke-foreground cursor-pointer">
                        <Plus className="size-4 !stroke-current" />
                        <span className="truncate">New doc</span>
                    </SidebarMenuButton>
                )}
            </DialogTrigger>
            <DialogContent className="max-w-md">
                <DialogHeader>
                    <DialogTitle>Create New Document</DialogTitle>
                    <DialogDescription>
                        Create a new document in the selected folder.
                    </DialogDescription>
                </DialogHeader>
                <form onSubmit={handleSubmit}>
                    <div className="grid gap-4 py-4">
                        <div className="grid gap-2">
                            <label htmlFor="title" className="text-sm font-medium">
                                Title
                            </label>
                            <Input
                                id="title"
                                value={title}
                                onChange={(e) => setTitle(e.target.value)}
                                placeholder="Document title"
                                required
                            />
                        </div>
                        <div className="grid gap-2">
                            <label className="text-sm font-medium">Icon (optional)</label>
                            <div className="relative">
                                <Button
                                    type="button"
                                    variant="outline"
                                    className="w-full justify-start"
                                    onClick={() => setShowIconPicker(!showIconPicker)}
                                >
                                    {IconComponent ? (
                                        <>
                                            <DynamicIcon name={selectedIcon as LucideIconName} className="size-4 mr-2" />
                                            <span>{selectedIcon}</span>
                                        </>
                                    ) : (
                                        <>
                                            <FileIcon className="size-4 mr-2" />
                                            <span>Select icon</span>
                                        </>
                                    )}
                                </Button>
                                {selectedIcon && (
                                    <button
                                        type="button"
                                        onClick={(e) => {
                                            e.stopPropagation()
                                            setSelectedIcon("")
                                        }}
                                        className="absolute right-2 top-1/2 -translate-y-1/2 p-1 hover:bg-muted rounded"
                                    >
                                        <X className="size-3" />
                                    </button>
                                )}
                                {showIconPicker && (
                                    <div ref={iconPickerRef} className="absolute z-10 w-full mt-1 bg-background border rounded-lg shadow-lg p-2 overflow-hidden">
                                        <div className="relative mb-2">
                                            <Search className="absolute left-2 top-1/2 -translate-y-1/2 size-4 text-muted-foreground" />
                                            <Input
                                                ref={iconSearchInputRef}
                                                placeholder="Search icons..."
                                                value={iconSearch}
                                                onChange={(e) => setIconSearch(e.target.value)}
                                                className="pl-8"
                                            />
                                        </div>
                                        <div className="grid grid-cols-6 gap-2 max-h-64 h-full overflow-y-auto">
                                            {iconNames.filter((iconName) => iconSearch === "" || iconName.toLowerCase().includes(iconSearch.toLowerCase())).map((iconName) => {
                                                try {
                                                    return (
                                                        <button
                                                            key={iconName}
                                                            type="button"
                                                            onClick={() => {
                                                                setSelectedIcon(iconName)
                                                                setShowIconPicker(false)
                                                                setIconSearch("")
                                                            }}
                                                            className={`p-2 rounded hover:bg-muted transition-colors ${selectedIcon === iconName ? "bg-primary/10 border border-primary" : ""
                                                                }`}
                                                            title={iconName}
                                                        >
                                                            <DynamicIcon name={iconName as LucideIconName} className="size-4 mx-auto" />
                                                        </button>
                                                    )
                                                } catch {
                                                    return <></>
                                                }
                                            })}
                                        </div>
                                    </div>
                                )}
                            </div>
                        </div>
                    </div>
                    <DialogFooter>
                        <Button type="button" variant="outline" onClick={() => setOpen(false)}>
                            Cancel
                        </Button>
                        <Button type="submit" disabled={createDocMutation.isPending}>
                            {createDocMutation.isPending ? "Creating..." : "Create"}
                        </Button>
                    </DialogFooter>
                </form>
            </DialogContent>
        </Dialog>
    )
}

function DeleteDocDialog({
    fullPath,
}: {
    fullPath: string
}) {
    const [open, setOpen] = useState(false)
    const queryClient = useQueryClient()
    const navigate = useNavigate()
    const deleteDocMutation = useMutation({
        mutationFn: deleteDoc,
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ["docs", "get-docs"] })
            setOpen(false)
            toast.success("Document deleted successfully")

            // wait 250ms before navigating to an existing document
            setTimeout(() => {
                const existingDoc = queryClient.getQueryData<FolderStructure[]>(["docs", "get-docs"])
                if (existingDoc && existingDoc.length > 0) {
                    navigate(`/${existingDoc[0].name ?? ""}`)
                }
            }, 250)
        },
    })

    const handleOpen = (e: React.MouseEvent) => {
        e.stopPropagation()
        setOpen(true)
    }

    return (
        <AlertDialog open={open}>
            <AlertDialogTrigger asChild onClick={handleOpen} className="p-0 border-none bg-transparent hidden group-hover/item:block cursor-pointer">
                <Icons.TrashIcon className="size-4 stroke-muted-foreground" />
            </AlertDialogTrigger>
            <AlertDialogContent>
                <AlertDialogHeader>
                    <AlertDialogTitle>Delete Document</AlertDialogTitle>
                    <AlertDialogDescription>
                        Are you sure you want to delete this document?
                    </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                    <AlertDialogCancel>Cancel</AlertDialogCancel>
                    <AlertDialogAction onClick={() => deleteDocMutation.mutate(fullPath)}>Delete</AlertDialogAction>
                </AlertDialogFooter>
            </AlertDialogContent>
        </AlertDialog>
    )
}

export function AppSidebar() {
    const navigate = useNavigate()
    const location = useLocation()
    const dragState = useRef<{
        draggedId: string | null
        dropTargetId: string | null
        dropPosition: 'before' | 'after' | 'inside' | null
    }>({
        draggedId: null,
        dropTargetId: null,
        dropPosition: null
    })
    const sidebarData = useQuery({
        queryKey: ["git", "repo-info"],
        queryFn: getRepoInfo,
        enabled: true,
    })
    const { isMobile } = useSidebar()
    const docsQuery = useQuery({
        queryKey: ["docs", "get-docs"],
        queryFn: getDocs,
        enabled: true,
    })
    const updateDocOrderMutation = useMutation({
        mutationFn: updateDocOrder,
        onMutate: async (variables) => {
            // Cancel outgoing refetches
            await queryClient.cancelQueries({ queryKey: ["docs", "get-docs"] })

            // Snapshot previous value
            const previousDocs = queryClient.getQueryData<FolderStructure[]>(["docs", "get-docs"])

            // Get the old path of the moved document before the move
            const oldPath = previousDocs ? getDocPath(previousDocs, variables.name) : []

            // Optimistically update
            const updatedDocs = normalizeDocs(variables)
            if (updatedDocs) {
                queryClient.setQueryData(["docs", "get-docs"], updatedDocs)
            }

            return { previousDocs, oldPath }
        },
        onError: (error, _variables, context) => {
            // Rollback on error
            if (context?.previousDocs) {
                queryClient.setQueryData(["docs", "get-docs"], context.previousDocs)
            }
            toast.error(`Failed to update doc order: ${error.message}`)
        },
        onSuccess: (_data, variables, context) => {
            // After successful move, check if we need to update the URL
            const currentPath = location.pathname.slice(1) // Remove leading slash
            if (!currentPath || !context?.oldPath) return

            const oldPathParts = context.oldPath
            const movedDocName = variables.name

            // Check if the current URL matches the moved doc or any of its parents
            const currentDocs = queryClient.getQueryData<FolderStructure[]>(["docs", "get-docs"])
            if (!currentDocs) return

            // Get the new path of the moved document
            const newPath = getDocPath(currentDocs, movedDocName)
            const newPathString = newPath.join('/')

            // Check if current path starts with the old path of the moved doc
            let shouldUpdateUrl = false
            let newUrlPath = currentPath

            // Check if the current path exactly matches the old path (viewing the moved doc itself)
            const oldPathString = oldPathParts.join('/')
            if (currentPath === oldPathString) {
                shouldUpdateUrl = true
                newUrlPath = newPathString
            } else if (currentPath.startsWith(oldPathString + '/')) {
                // The current path is a child of the moved doc
                // Replace the old path prefix with the new path
                const remainingPath = currentPath.slice(oldPathString.length + 1)
                newUrlPath = newPathString ? `${newPathString}/${remainingPath}` : remainingPath
                shouldUpdateUrl = true
            }

            if (shouldUpdateUrl) {
                // Wait a bit for the query to be invalidated and refetched
                setTimeout(() => {
                    navigate(`/${newUrlPath}`, { replace: true })
                }, 100)
            }
        },
        onSettled: () => {
            queryClient.invalidateQueries({ queryKey: ["docs", "get-docs"] })
        },
    })

    const [expandedItems, setExpandedItems] = useState<Set<string>>(new Set())

    const toggleExpanded = (name: string) => {
        setExpandedItems((prev) => {
            const next = new Set(prev)
            if (next.has(name)) {
                next.delete(name)
            } else {
                next.add(name)
            }
            return next
        })
    }

    // get path of doc
    const getDocPath = (data: FolderStructure[], name: string): string[] => {
        for (const item of data) {
            if (item.name === name) {
                return [item.name]
            }
            const childResult = getDocPath(item.children, name)
            if (childResult.length > 0) {
                return [item.name, ...childResult]
            }
        }
        return []
    }

    // Find and remove a doc from the tree, returning the updated tree and the removed doc
    const removeDocFromTree = (
        docs: FolderStructure[],
        name: string
    ): { docs: FolderStructure[]; removed: FolderStructure | null } => {
        for (let i = 0; i < docs.length; i++) {
            if (docs[i].name === name) {
                const removed = docs[i]
                const newDocs = [...docs.slice(0, i), ...docs.slice(i + 1)]
                return { docs: newDocs, removed }
            }
            // Search in children
            const result = removeDocFromTree(docs[i].children, name)
            if (result.removed) {
                return {
                    docs: docs.map((doc, idx) =>
                        idx === i ? { ...doc, children: result.docs } : doc
                    ),
                    removed: result.removed,
                }
            }
        }
        return { docs, removed: null }
    }

    // Insert a doc at a specific path, positioned relative to before/after siblings
    const insertDocAtPath = (
        docs: FolderStructure[],
        path: string[],
        doc: FolderStructure,
        beforeSibling: string | null,
        afterSibling: string | null
    ): FolderStructure[] => {
        // Helper to insert into a list based on siblings
        const insertIntoList = (list: FolderStructure[]): FolderStructure[] => {
            // Sort by order first
            const sorted = [...list].sort((a, b) => (a.order ?? 0) - (b.order ?? 0))

            if (afterSibling) {
                // Insert before the specified sibling
                const idx = sorted.findIndex((d) => d.name === afterSibling)
                if (idx !== -1) {
                    return [...sorted.slice(0, idx + 1), doc, ...sorted.slice(idx + 1)]
                }
            }

            if (beforeSibling) {
                // Insert after the specified sibling
                const idx = sorted.findIndex((d) => d.name === beforeSibling)
                if (idx !== -1) {
                    return [...sorted.slice(0, idx), doc, ...sorted.slice(idx)]
                }
            }

            // No siblings specified or not found - append to end
            return [...sorted, doc]
        }

        // Insert at root level
        if (path.length === 0) {
            return insertIntoList(docs)
        }

        const [currentName, ...remainingPath] = path

        return docs.map((d) => {
            if (d.name !== currentName) return d

            if (remainingPath.length === 0) {
                // Insert into this doc's children
                return { ...d, children: insertIntoList(d.children) }
            }

            // Continue down the path
            return {
                ...d,
                children: insertDocAtPath(d.children, remainingPath, doc, beforeSibling, afterSibling),
            }
        })
    }

    // Normalize orders at a specific path (renumber 0, 1, 2, ...)
    const normalizeOrdersAtPath = (
        docs: FolderStructure[],
        path: string[]
    ): FolderStructure[] => {
        if (path.length === 0) {
            // Normalize root level
            return docs.map((doc, idx) => ({ ...doc, order: idx ?? 0 }))
        }

        const [currentName, ...remainingPath] = path

        return docs.map((doc) => {
            if (doc.name !== currentName) return doc

            if (remainingPath.length === 0) {
                // Normalize this doc's children
                return { ...doc, children: doc.children.map((child, idx) => ({ ...child, order: idx ?? 0 })) }
            }

            return {
                ...doc,
                children: normalizeOrdersAtPath(doc.children, remainingPath),
            }
        })
    }

    // Main function: move doc to new path with new order, normalize affected paths
    const normalizeDocs = (update: DocOrderNode): FolderStructure[] | undefined => {
        const { name, updatedPath, beforeSibling, afterSibling } = update
        const currentDocs = docsQuery.data
        if (!currentDocs) return undefined

        // Find current parent path of the doc
        const currentPath = getDocPath(currentDocs, name)
        const currentParentPath = currentPath.slice(0, -1)

        // Remove doc from current location
        const { docs: docsAfterRemove, removed } = removeDocFromTree(currentDocs, name)
        if (!removed) return undefined

        // Parse the updated parent path
        const newParentPath = updatedPath ? updatedPath.split('/') : []

        // Insert at new location
        let updatedDocs = insertDocAtPath(docsAfterRemove, newParentPath, removed, beforeSibling, afterSibling)
        // Normalize orders at destination
        updatedDocs = normalizeOrdersAtPath(updatedDocs, newParentPath)

        // If parent path changed, also normalize source
        const pathsMatch = currentParentPath.join('/') === newParentPath.join('/')
        if (!pathsMatch) {
            updatedDocs = normalizeOrdersAtPath(updatedDocs, currentParentPath)
        }

        return updatedDocs
    }

    // recursively loop through the sidebarData to find the before and after elements
    const getSiblingElements = (data: FolderStructure[], id: string): [string | null, string | null] => {
        for (let i = 0; i < data.length; i++) {
            if (data[i].name === id) {
                return [data[i - 1]?.name ?? null, data[i + 1]?.name ?? null]
            }
            // Search in children - continue loop if not found
            const childResult = getSiblingElements(data[i].children, id)
            if (childResult[0] !== null || childResult[1] !== null) {
                return childResult
            }
        }
        return [null, null]
    }

    const handleDragOver = (e: React.DragEvent<HTMLButtonElement | HTMLAnchorElement | HTMLDivElement>, id: string) => {
        e.preventDefault()
        // if hovering over the same element, do nothing
        if (dragState.current.draggedId === id) return;

        // if item is a div element, do nothing
        if (e.currentTarget instanceof HTMLDivElement) return;
        // retrieve sibling elements from sidebarData
        const siblings = getSiblingElements(docsQuery.data!, dragState.current.draggedId!)

        const rect = (e.currentTarget as HTMLElement).getBoundingClientRect()
        const offsetY = e.clientY - rect.top
        const height = rect.height


        let position: 'before' | 'after' | 'inside'


        if (offsetY < height * 0.25) {
            position = 'before'
        } else if (offsetY > height * 0.75) {
            position = 'after'
        } else {
            position = 'inside'
        }

        // if going to place in the same position it's already in, do nothing
        if ((id === siblings[0] && position === 'after') || (id === siblings[1] && position === 'before')) {
            return
        }

        dragState.current.dropTargetId = id
        dragState.current.dropPosition = position

        updateDropIndicator()
    }

    const handleDragStart = (e: React.DragEvent, id: string) => {
        dragState.current.draggedId = id

        // Required for Firefox + better browser support
        e.dataTransfer.setData("text/plain", id)
        e.dataTransfer.effectAllowed = "move"
    }

    const handleDragEnd = () => {
        // Clear everything when drag ends (regardless of where it was dropped)
        clearDropIndicators()
        dragState.current.draggedId = null
        dragState.current.dropTargetId = null
        dragState.current.dropPosition = null
    }

    function clearDropIndicators() {
        const dropIndicatorsBefore = document.querySelectorAll(".drop-indicator-before")
        dropIndicatorsBefore.forEach((indicator) => {
            indicator.classList.toggle("hidden", true)
        })
        const dropIndicatorsAfter = document.querySelectorAll(".drop-indicator-after")
        dropIndicatorsAfter.forEach((indicator) => {
            indicator.classList.toggle("hidden", true)
        })
        document.querySelectorAll(`[data-drag-id="${dragState.current.dropTargetId}"][data-slot="sidebar-menu-sub-button"], [data-drag-id="${dragState.current.dropTargetId}"][data-slot="sidebar-menu-button"]`).forEach((element) => {
            (element as HTMLElement).classList.toggle("bg-sidebar-accent", false)
        })
    }

    function updateDropIndicator() {
        clearDropIndicators()

        switch (dragState.current.dropPosition) {
            case 'before':
                // set the corresponding drop indicator to visible
                document.querySelector(`.drop-indicator-before[data-drag-id="${dragState.current.dropTargetId}"]`)?.classList.toggle("hidden", false)
                break
            case 'after':
                // set the corresponding drop indicator to visible
                document.querySelector(`.drop-indicator-after[data-drag-id="${dragState.current.dropTargetId}"]`)?.classList.toggle("hidden", false)
                break
            case 'inside':
                // set the corresponding drop indicator to visible
                document.querySelector(`[data-drag-id="${dragState.current.dropTargetId}"][data-slot="sidebar-menu-sub-button"], [data-drag-id="${dragState.current.dropTargetId}"][data-slot="sidebar-menu-button"]`)?.classList.toggle("bg-sidebar-accent", true)
                break
        }
    }

    function getUpdatedPath(data: FolderStructure[], id: string): string[] {
        for (const item of data) {
            if (item.name === id) {
                return [item.name]
            }
            // Search in children
            const childResult = getUpdatedPath(item.children, id)
            if (childResult.length > 0) {
                return [item.name, ...childResult]
            }
        }
        return []
    }

    function handleDrop(e: React.DragEvent) {
        e.preventDefault()
        clearDropIndicators()
        const draggedId = e.dataTransfer.getData("text/plain")
        const dropTargetId = dragState.current.dropTargetId
        const dropPosition = dragState.current.dropPosition

        // path refers to the element it's being dropped on, order refers to the order number of the element it's being dropped on
        const path = getUpdatedPath(docsQuery.data!, dropTargetId!)

        const siblings = getSiblingElements(docsQuery.data!, dropTargetId!)

        let beforeSibling: string | null = null;
        let afterSibling: string | null = null;
        switch (dropPosition) {
            case 'before':
                afterSibling = siblings[0];
                beforeSibling = dropTargetId;
                break;
            case 'after':
                afterSibling = dropTargetId;
                beforeSibling = siblings[1];
                break;
        }

        updateDocOrderMutation.mutate({
            name: draggedId,
            updatedPath: (dropPosition === 'before' || dropPosition === 'after') ? path.slice(0, -1).join('/') ?? '' : path.join('/'),
            beforeSibling,
            afterSibling,
        })
    }

    const DocItem = ({
        doc,
        fullPath,
        isNested,
    }: {
        doc: FolderStructure
        fullPath: string
        isNested: boolean
    }) => {
        const isExpanded = expandedItems.has(fullPath)

        if (isNested) {
            return (
                <SidebarMenuSubItem>
                    <SidebarMenuSubButton
                        data-drag-id={doc.name}
                        className="group/item cursor-pointer"
                        onClick={() => navigate(`/${fullPath}`)}
                        draggable
                        onDragOver={(e) => handleDragOver(e, doc.name)}
                        onDragStart={(e) => handleDragStart(e, doc.name)}
                        onDragEnd={handleDragEnd}
                        onDrop={(e) => handleDrop(e)}
                    >
                        <div className="flex items-center justify-between w-full">
                            <div className="flex items-center gap-2">
                                <ChevronRight
                                    onClick={(e) => {
                                        e.stopPropagation()
                                        toggleExpanded(fullPath)
                                    }}
                                    className={`size-4 transition-transform ${isExpanded ? "rotate-90" : ""}`}
                                />
                                {doc.icon ? <DynamicIcon name={doc.icon as LucideIconName} /> : <FileIcon size={16} />}
                                <span className="truncate">{doc.title}</span>
                            </div>
                            <DeleteDocDialog fullPath={fullPath} />
                        </div>
                    </SidebarMenuSubButton>
                    {isExpanded && (
                        <SidebarMenuSub onDrop={(e) => handleDrop(e)}>
                            {doc.children.map((child) => {
                                const childPath = `${fullPath}/${child.name}`
                                return (
                                    <React.Fragment key={child.name}>
                                        <div
                                            data-drag-id={child.name}
                                            onDragOver={(e) => handleDragOver(e, doc.name)}
                                            onDrop={(e) => handleDrop(e)}
                                            className="hidden drop-indicator-before border-b border-2 border-primary/10 w-full"></div>
                                        <DocItem
                                            doc={child}
                                            fullPath={childPath}
                                            isNested={true}
                                        />
                                        <div
                                            data-drag-id={child.name}
                                            onDragOver={(e) => handleDragOver(e, doc.name)}
                                            onDrop={(e) => handleDrop(e)}
                                            className="hidden drop-indicator-after border-b border-2 border-primary/10 w-full"></div>
                                    </React.Fragment>
                                )
                            })}
                            <SidebarMenuSubItem>
                                <CreateDocDialog parentPath={fullPath} isNested={true} />
                            </SidebarMenuSubItem>
                        </SidebarMenuSub>
                    )}
                </SidebarMenuSubItem>
            )
        }

        return (
            <React.Fragment key={doc.name}>
                <div
                    data-drag-id={doc.name}
                    onDragOver={(e) => handleDragOver(e, doc.name)}
                    onDrop={(e) => handleDrop(e)}
                    className="hidden drop-indicator-before border-b border-2 border-primary/10 w-full"></div>
                <SidebarMenuItem>
                    <SidebarMenuButton
                        data-drag-id={doc.name}
                        className="group/item cursor-pointer"
                        onClick={() => navigate(`/${fullPath}`)}
                        draggable
                        onDragOver={(e) => handleDragOver(e, doc.name)}
                        onDragStart={(e) => handleDragStart(e, doc.name)}
                        onDragEnd={handleDragEnd}
                        onDrop={(e) => handleDrop(e)}
                    >
                        <div className="flex items-center justify-between w-full">
                            <div className="flex items-center gap-2">
                                <ChevronRight
                                    onClick={(e) => {
                                        e.stopPropagation()
                                        toggleExpanded(fullPath)
                                    }}
                                    className={`size-4 transition-transform ${isExpanded ? "rotate-90" : ""}`}
                                />
                                {doc.icon ? <DynamicIcon name={doc.icon as LucideIconName} size={16} /> : <FileIcon size={16} />}
                                <span className="truncate font-medium">{doc.title}</span>
                            </div>
                            <DeleteDocDialog fullPath={fullPath} />
                        </div>
                    </SidebarMenuButton>
                    {isExpanded && (
                        <SidebarMenuSub>
                            {doc.children.map((child) => {
                                const childPath = `${fullPath}/${child.name}`
                                return (
                                    <React.Fragment key={child.name}>
                                        <div
                                            data-drag-id={child.name}
                                            onDragOver={(e) => handleDragOver(e, doc.name)}
                                            onDrop={(e) => handleDrop(e)}
                                            className="hidden drop-indicator-before border-b border-2 border-primary/10 w-full"></div>
                                        <DocItem
                                            doc={child}
                                            fullPath={childPath}
                                            isNested={true}
                                        />
                                        <div
                                            data-drag-id={child.name}
                                            onDragOver={(e) => handleDragOver(e, doc.name)}
                                            onDrop={(e) => handleDrop(e)}
                                            className="hidden drop-indicator-after border-b border-2 border-primary/10 w-full"></div>
                                    </React.Fragment>
                                )
                            })}
                            <SidebarMenuSubItem>
                                <CreateDocDialog parentPath={fullPath} isNested={true} />
                            </SidebarMenuSubItem>
                        </SidebarMenuSub>
                    )}
                </SidebarMenuItem>
                <div
                    data-drag-id={doc.name}
                    onDragOver={(e) => handleDragOver(e, doc.name)}
                    onDrop={(e) => handleDrop(e)}
                    className="hidden drop-indicator-after border-b border-2 border-primary/10 w-full"></div>
            </React.Fragment>
        )
    }

    return (
        <Sidebar variant="inset">
            <SidebarHeader className="flex flex-row items-center gap-2">
                <img src="/transparent-dark-logo.svg" alt="Doclific" className="size-8 dark:hidden" />
                <img src="/transparent-logo.svg" alt="Doclific" className="size-8 hidden dark:block" />
                <span className="text-2xl font-extrabold">Doclific</span>
            </SidebarHeader>
            <SidebarContent>
                <SidebarGroup>
                    <SidebarGroupLabel>{sidebarData.data?.repositoryName} ({sidebarData.data?.repositoryBranch})</SidebarGroupLabel>
                    <SidebarGroupContent>
                        <SidebarMenu>
                            {docsQuery.data?.map((doc) => (
                                <DocItem key={doc.name} doc={doc} fullPath={doc.name} isNested={false} />
                            ))}
                            <SidebarMenuItem>
                                <CreateDocDialog parentPath="" isNested={false} />
                            </SidebarMenuItem>
                        </SidebarMenu>
                    </SidebarGroupContent>
                </SidebarGroup>
            </SidebarContent>
            <SidebarFooter>
                <SidebarMenu>
                    <SidebarMenuItem>
                        <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                                <SidebarMenuButton
                                    size="lg"
                                    className="data-[state=open]:bg-sidebar-accent data-[state=open]:text-sidebar-accent-foreground"
                                >
                                    <Avatar className="h-8 w-8 rounded-lg grayscale">
                                        <AvatarFallback className="rounded-lg">{sidebarData.data?.user?.charAt(0).toUpperCase()}</AvatarFallback>
                                    </Avatar>
                                    <div className="grid flex-1 text-left text-sm leading-tight">
                                        <span className="truncate font-medium">{sidebarData.data?.user}</span>
                                        <span className="text-muted-foreground truncate text-xs">
                                            {sidebarData.data?.userEmail ?? sidebarData.data?.user}
                                        </span>
                                    </div>
                                    <EllipsisVertical className="ml-auto size-4" />
                                </SidebarMenuButton>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent
                                className="w-(--radix-dropdown-menu-trigger-width) min-w-56 rounded-lg"
                                side={isMobile ? "bottom" : "right"}
                                align="end"
                                sideOffset={4}
                            >
                                <DropdownMenuLabel className="p-0 font-normal">
                                    <div className="flex items-center gap-2 px-1 py-1.5 text-left text-sm">
                                        <Avatar className="h-8 w-8 rounded-lg">
                                            <AvatarFallback className="rounded-lg">{sidebarData.data?.user?.charAt(0).toUpperCase()}</AvatarFallback>
                                        </Avatar>
                                        <div className="grid flex-1 text-left text-sm leading-tight">
                                            <span className="truncate font-medium">{sidebarData.data?.user}</span>
                                            <span className="text-muted-foreground truncate text-xs">
                                                {sidebarData.data?.userEmail ?? sidebarData.data?.user}
                                            </span>
                                        </div>
                                    </div>
                                </DropdownMenuLabel>
                                <DropdownMenuSeparator />
                                <DropdownMenuGroup>
                                    <DropdownMenuItem>
                                        <UserCircle className="mr-2 size-4" />
                                        Account
                                    </DropdownMenuItem>
                                </DropdownMenuGroup>
                            </DropdownMenuContent>
                        </DropdownMenu>
                    </SidebarMenuItem>
                </SidebarMenu>
            </SidebarFooter>
        </Sidebar>
    )
}
