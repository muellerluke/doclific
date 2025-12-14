import { orpcTs } from "@/lib/orpc"
import { useQuery } from "@tanstack/react-query"
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

    console.log(docQuery.data)


    return (
        <div className="max-w-3xl mx-auto w-full relative">
            {docQuery.data && (
                <MarkdownDemo
                    initialMarkdown={docQuery.data}
                />
            )}
        </div>
    )
}