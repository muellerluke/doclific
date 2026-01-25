import { useMutation, useQuery } from "@tanstack/react-query"
import { useLocation } from "react-router"
import { useEffect } from "react"
import RichTextEditor from "@/components/editor-container";
import { getDoc, updateDoc } from "@/api/docs";

export default function RTE() {

    const { pathname } = useLocation()
    const filePath = pathname.slice(1)
    const docQuery = useQuery({
        queryKey: ["docs", "get-doc", filePath],
        queryFn: () => getDoc(filePath),
        enabled: true,
        refetchOnWindowFocus: true,
        refetchOnMount: true,
    })

    // Refetch when page becomes visible (user returns to tab/window)
    useEffect(() => {
        const handleVisibilityChange = () => {
            if (document.visibilityState === 'visible') {
                docQuery.refetch()
            }
        }

        document.addEventListener('visibilitychange', handleVisibilityChange)
        return () => {
            document.removeEventListener('visibilitychange', handleVisibilityChange)
        }
    }, [docQuery])

    const updateDocMutation = useMutation({
        mutationKey: ["docs", "update-doc", filePath],
        mutationFn: (content: string) => updateDoc(filePath, content),
    })

    const onUpdate = (content: string) => {
        updateDocMutation.mutate(content)
    }

    return (
        <div className="flex-1 relative">
            <div className="absolute inset-0 overflow-y-auto">
                <div className="max-w-4xl mx-auto w-full relative p-4">
                    {docQuery.data && (
                        <RichTextEditor
                            key={filePath}
                            initialMarkdown={docQuery.data}
                            onUpdate={onUpdate}
                        />
                    )}
                </div>
            </div>
        </div>
    )
}