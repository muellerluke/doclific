import { BookOpen } from "lucide-react"

export function NoDocSelected() {
    return (
        <div className="flex h-full min-h-[calc(100vh-var(--header-height))] w-full items-center justify-center p-6">
            <div className="w-full max-w-md rounded-2xl border bg-background/60 p-8 text-center shadow-sm">
                <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-muted">
                    <BookOpen className="h-6 w-6 text-muted-foreground" />
                </div>
                <h2 className="text-lg font-semibold text-foreground">No document selected</h2>
                <p className="mt-2 text-sm text-muted-foreground">
                    Select an existing doc from the left sidebar, or create a new one to
                    start writing.
                </p>
            </div>
        </div>
    )
}
