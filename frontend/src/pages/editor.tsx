import { orpcTs } from "@/lib/orpc"
import { useMutation, useQuery } from "@tanstack/react-query"
import { useLocation } from "react-router"
import RichTextEditor from "@/components/editor-container";

export default function RTE() {

    const { pathname } = useLocation()
    const filePath = pathname.slice(1)
    const docQuery = useQuery({
        ...orpcTs.docs.getDoc.queryOptions({
            input: {
                filePath,
            },
        }),
        enabled: true,
    })

    const updateDoc = useMutation({
        ...orpcTs.docs.updateDoc.mutationOptions(),
    })

    const onUpdate = (content: string) => {
        updateDoc.mutate({
            filePath,
            content,
        })
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