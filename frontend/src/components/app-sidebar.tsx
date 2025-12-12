import { ChevronRight, EllipsisVertical, FileIcon, UserCircle } from "lucide-react";
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
import { useQuery } from "@tanstack/react-query"
import { useState } from "react"
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuLabel, DropdownMenuSeparator, DropdownMenuTrigger, DropdownMenuGroup } from "@/components/ui/dropdown-menu"
import { Avatar, AvatarFallback } from "@/components/ui/avatar"
import { useSidebar } from "@/components/ui/sidebar"
import type { FolderStructure } from "@/types/docs"
import { DynamicIcon, type LucideIconName } from "./ui/dynamic-icon"
import { useNavigate } from "react-router"

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

    const renderDocItem = (doc: FolderStructure, fullPath: string, isNested: boolean = false) => {
        const hasChildren = doc.children.length > 0
        const isExpanded = expandedItems.has(fullPath)

        if (isNested) {
            return (
                <SidebarMenuSubItem key={fullPath}>
                    <SidebarMenuSubButton
                        className="cursor-pointer"
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
                    </SidebarMenuSubButton>
                    {hasChildren && isExpanded && (
                        <SidebarMenuSub>
                            {doc.children.map((child) => {
                                const childPath = `${fullPath}/${child.name}`
                                return renderDocItem(child, childPath, true)
                            })}
                        </SidebarMenuSub>
                    )}
                </SidebarMenuSubItem>
            )
        }

        return (
            <SidebarMenuItem key={fullPath}>
                <SidebarMenuButton
                    className="cursor-pointer"
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
                </SidebarMenuButton>
                {hasChildren && isExpanded && (
                    <SidebarMenuSub>
                        {doc.children.map((child) => {
                            const childPath = `${fullPath}/${child.name}`
                            return renderDocItem(child, childPath, true)
                        })}
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