import { orpcTs } from "@/lib/orpc"
import { useMutation, useQuery } from "@tanstack/react-query"
import { useLocation } from "react-router"
import MarkdownDemo from "@/components/markdown-to-slate-demo";

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
        <div className="max-w-3xl mx-auto w-full relative">
            {docQuery.data && (
                <MarkdownDemo
                    initialMarkdown={docQuery.data}
                    onUpdate={onUpdate}
                />
            )}
        </div>
    )
}