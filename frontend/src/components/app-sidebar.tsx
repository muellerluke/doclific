import { ChevronRight, EllipsisVertical, FileIcon, Plus, UserCircle } from "lucide-react";
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
import { useState } from "react"
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
    const queryClient = useQueryClient()
    const createDocMutation = useMutation({
        ...orpcTs.docs.createDoc.mutationOptions(),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: orpcTs.docs.getDocs.queryKey() })
            setOpen(false)
            setTitle("")
        },
    })

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault()
        createDocMutation.mutate({
            filePath: parentPath,
            title,
        })
    }

    return (
        <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger asChild>
                {isNested ? (
                    <SidebarMenuSubButton className="text-muted-foreground hover:text-foreground">
                        <Plus className="size-4" />
                        <span className="truncate">New doc</span>
                    </SidebarMenuSubButton>
                ) : (
                    <SidebarMenuButton className="text-muted-foreground hover:text-foreground">
                        <Plus className="size-4" />
                        <span className="truncate">New doc</span>
                    </SidebarMenuButton>
                )}
            </DialogTrigger>
            <DialogContent>
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
        const hasChildren = doc.children.length > 0
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
                            {hasChildren && (
                                <ChevronRight
                                    onClick={(e) => {
                                        e.stopPropagation()
                                        if (hasChildren) toggleExpanded(fullPath)
                                    }}
                                    className={`size-4 transition-transform ${isExpanded ? "rotate-90" : ""}`}
                                />
                            )}
                            {doc.icon ? <DynamicIcon name={doc.icon as LucideIconName} /> : <FileIcon />}
                            <span className="truncate">{doc.title}</span>
                            <Plus className="size-4 ml-auto opacity-0 group-hover:opacity-100 transition-opacity" />
                        </SidebarMenuSubButton>
                        {hasChildren && isExpanded && (
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
                        {hasChildren && (
                            <ChevronRight
                                onClick={(e) => {
                                    e.stopPropagation()
                                    if (hasChildren) toggleExpanded(fullPath)
                                }}
                                className={`size-4 transition-transform ${isExpanded ? "rotate-90" : ""}`}
                            />
                        )}
                        {doc.icon ? <DynamicIcon name={doc.icon as LucideIconName} /> : <FileIcon />}
                        <span className="truncate font-medium">{doc.title}</span>
                        <Plus className="size-4 ml-auto opacity-0 group-hover:opacity-100 transition-opacity" />
                    </SidebarMenuButton>
                    {hasChildren && isExpanded && (
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