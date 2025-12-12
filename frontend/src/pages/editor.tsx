import { orpcTs } from "@/lib/orpc"
import { useQuery } from "@tanstack/react-query"
import { useLocation } from "react-router"


export default function Editor() {
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
        <div>
            <h1>Editor</h1>
        </div>
    )
}