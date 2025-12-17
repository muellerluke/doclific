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
import { orpcTs } from "@/lib/orpc"
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
} from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"

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
    const queryClient = useQueryClient()

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
    const createDocMutation = useMutation({
        ...orpcTs.docs.createDoc.mutationOptions(),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: orpcTs.docs.getDocs.queryKey() })
            setOpen(false)
            setTitle("")
            setSelectedIcon("")
            setIconSearch("")
            setShowIconPicker(false)
        },
    })

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault()
        createDocMutation.mutate({
            filePath: parentPath,
            title,
            icon: selectedIcon || undefined,
        })
    }

    const IconComponent = selectedIcon ? <DynamicIcon name={selectedIcon as LucideIconName} /> : null

    return (
        <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger asChild>
                {isNested ? (
                    <SidebarMenuSubButton className="text-muted-foreground hover:text-foreground">
                        <Plus className="size-4 !stroke-current" />
                        <span className="truncate">New doc</span>
                    </SidebarMenuSubButton>
                ) : (
                    <SidebarMenuButton className="text-muted-foreground stroke-muted-foreground hover:text-foreground hover:stroke-foreground">
                        <Plus className="size-4 !stroke-current" />
                        <span className="truncate">New doc</span>
                    </SidebarMenuButton>
                )}
            </DialogTrigger>
            <DialogContent className="max-w-md">
                <DialogHeader>
                    <DialogTitle>Create New Document</DialogTitle>
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
                                    <div ref={iconPickerRef} className="absolute z-10 w-full mt-1 bg-background border rounded-lg shadow-lg p-2 max-h-64 overflow-y-auto">
                                        <div className="relative mb-2">
                                            <Search className="absolute left-2 top-1/2 -translate-y-1/2 size-4 text-muted-foreground" />
                                            <Input
                                                placeholder="Search icons..."
                                                value={iconSearch}
                                                onChange={(e) => setIconSearch(e.target.value)}
                                                className="pl-8"
                                            />
                                        </div>
                                        <div className="grid grid-cols-6 gap-2">
                                            {Object.keys(Icons).map((iconName) => {
                                                try {
                                                    const Icon = Icons[iconName as keyof typeof Icons]

                                                    const IconComponent = Icon as React.ComponentType<{ className?: string }>
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
                                                            <IconComponent className="size-4 mx-auto" />
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

export function AppSidebar() {
    const navigate = useNavigate()
    const sidebarData = useQuery({
        ...orpcTs.git.getRepoInfo.queryOptions(),
        enabled: true,
    })
    const { isMobile } = useSidebar()
    const docsQuery = useQuery({
        ...orpcTs.docs.getDocs.queryOptions(),
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
        index: number = 0,
        totalSiblings: number = 0
    ) => {
        const isExpanded = expandedItems.has(fullPath)
        const isLast = index === totalSiblings - 1

        if (isNested) {
            return (
                <>
                    <SidebarMenuSubItem key={fullPath}>
                        <SidebarMenuSubButton
                            className="group cursor-pointer"
                            onClick={() => navigate(`/${fullPath}`)}
                        >
                            <ChevronRight
                                onClick={(e) => {
                                    e.stopPropagation()
                                    toggleExpanded(fullPath)
                                }}
                                className={`size-4 transition-transform ${isExpanded ? "rotate-90" : ""}`}
                            />
                            {doc.icon ? <DynamicIcon name={doc.icon as LucideIconName} /> : <FileIcon />}
                            <span className="truncate">{doc.title}</span>
                        </SidebarMenuSubButton>
                        {isExpanded && (
                            <SidebarMenuSub>
                                {doc.children.map((child, childIndex) => {
                                    const childPath = `${fullPath}/${child.name}`
                                    return renderDocItem(child, childPath, true, childIndex, doc.children.length)
                                })}
                                <SidebarMenuSubItem>
                                    <CreateDocDialog parentPath={fullPath} isNested={true} />
                                </SidebarMenuSubItem>
                            </SidebarMenuSub>
                        )}
                    </SidebarMenuSubItem>
                </>
            )
        }

        return (
            <>
                <SidebarMenuItem key={fullPath}>
                    <SidebarMenuButton
                        className="group cursor-pointer"
                        onClick={() => navigate(`/${fullPath}`)}
                    >
                        <ChevronRight
                            onClick={(e) => {
                                e.stopPropagation()
                                toggleExpanded(fullPath)
                            }}
                            className={`size-4 transition-transform ${isExpanded ? "rotate-90" : ""}`}
                        />
                        {doc.icon ? <DynamicIcon name={doc.icon as LucideIconName} /> : <FileIcon />}
                        <span className="truncate font-medium">{doc.title}</span>
                    </SidebarMenuButton>
                    {isExpanded && (
                        <SidebarMenuSub>
                            {doc.children.map((child, childIndex) => {
                                const childPath = `${fullPath}/${child.name}`
                                return renderDocItem(child, childPath, true, childIndex, doc.children.length)
                            })}
                            <SidebarMenuSubItem>
                                <CreateDocDialog parentPath={fullPath} isNested={true} />
                            </SidebarMenuSubItem>
                        </SidebarMenuSub>
                    )}
                </SidebarMenuItem>
                {isLast && (
                    <SidebarMenuItem>
                        <CreateDocDialog parentPath="" isNested={false} />
                    </SidebarMenuItem>
                )}
            </>
        )
    }

    const docsMenu = (docs: FolderStructure[]): React.ReactNode[] => {
        return docs.map((doc, index) => renderDocItem(doc, doc.name, false, index, docs.length))
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