import { SidebarInset, SidebarProvider, SidebarTrigger } from "@/components/ui/sidebar"
import { AppSidebar } from "@/components/app-sidebar"
import { Separator } from "@radix-ui/react-separator"
import { QueryClient, QueryClientProvider } from "@tanstack/react-query"
import { ModeToggle } from "./components/mode-toggle"

const queryClient = new QueryClient()


export default function Layout({ children }: { children: React.ReactNode }) {
    return (
        <QueryClientProvider client={queryClient}>
            <SidebarProvider style={
                {
                    "--sidebar-width": "calc(var(--spacing) * 72)",
                    "--header-height": "calc(var(--spacing) * 12)",
                } as React.CSSProperties
            }>
                <AppSidebar />
                <SidebarInset className="overflow-hidden">
                    <header className="flex h-(--header-height) shrink-0 items-center gap-2 border-b transition-[width,height] ease-linear group-has-data-[collapsible=icon]/sidebar-wrapper:h-(--header-height)">
                        <div className="flex w-full items-center justify-between gap-1 px-4 lg:gap-2 lg:px-6">
                            <div className="flex items-center gap-1 lg:gap-2">
                                <SidebarTrigger className="-ml-1" />
                                <Separator
                                    orientation="vertical"
                                    className="mx-2 data-[orientation=vertical]:h-4"
                                />
                                <h1 className="text-base font-medium">Doclific</h1>
                            </div>

                            <ModeToggle />
                        </div>
                    </header>
                    {children}
                </SidebarInset>
            </SidebarProvider>
        </QueryClientProvider>
    )
}