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
import { useNavigate } from "react-router"
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
import { createDoc, deleteDoc, getDocs } from "@/api/docs";
import { getRepoInfo } from "@/api/git";

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

    return (
        <AlertDialog open={open} onOpenChange={setOpen}>
            <AlertDialogTrigger asChild className="p-0 border-none bg-transparent hidden group-hover/item:block cursor-pointer">
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

    const renderDocItem = (
        doc: FolderStructure,
        fullPath: string,
        isNested: boolean = false,
    ) => {
        const isExpanded = expandedItems.has(fullPath)

        if (isNested) {
            return (
                <React.Fragment key={doc.name}>
                    <SidebarMenuSubItem key={fullPath}>
                        <SidebarMenuSubButton
                            className="group/item cursor-pointer"
                            onClick={() => navigate(`/${fullPath}`)}
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
                            <SidebarMenuSub>
                                {doc.children.map((child) => {
                                    const childPath = `${fullPath}/${child.name}`
                                    return renderDocItem(child, childPath, true)
                                })}
                                <SidebarMenuSubItem>
                                    <CreateDocDialog parentPath={fullPath} isNested={true} />
                                </SidebarMenuSubItem>
                            </SidebarMenuSub>
                        )}
                    </SidebarMenuSubItem>
                </React.Fragment>
            )
        }

        return (
            <SidebarMenuItem key={fullPath}>
                <SidebarMenuButton
                    className="group/item cursor-pointer"
                    onClick={() => navigate(`/${fullPath}`)}
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
                            return renderDocItem(child, childPath, true)
                        })}
                        <SidebarMenuSubItem>
                            <CreateDocDialog parentPath={fullPath} isNested={true} />
                        </SidebarMenuSubItem>
                    </SidebarMenuSub>
                )}
            </SidebarMenuItem>
        )
    }

    const docsMenu = (docs: FolderStructure[]): React.ReactNode[] => {
        return docs.map((doc) => renderDocItem(doc, doc.name, false))
    }


    return (
        <Sidebar variant="inset">
            <SidebarHeader>
                <span className="text-2xl font-extrabold italic" style={{ fontFamily: 'Google Sans Code' }}>Doclific</span>
            </SidebarHeader>
            <SidebarContent>
                <SidebarGroup>
                    <SidebarGroupLabel>{sidebarData.data?.repositoryName} ({sidebarData.data?.repositoryBranch})</SidebarGroupLabel>
                    <SidebarGroupContent>
                        <SidebarMenu>
                            {docsMenu(docsQuery.data ?? [])}
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