import { orpcTs } from "@/lib/orpc"
import { useQuery } from "@tanstack/react-query"
import { useLocation } from "react-router"
import type { FolderStructure } from "@/types/docs"

export function LayoutHeader() {
    // get the current path
    const path = useLocation()

    const pathArray = path.pathname.split("/").filter(Boolean)

    // get docs query
    const docsQuery = useQuery({
        ...orpcTs.docs.getDocs.queryOptions(),
        enabled: true,
    })

    // recursively loop through docsQuery.data and find the item that matches the path
    const findItem = (items: FolderStructure[], path: string[], index: number) => {
        for (const item of items) {
            if (item.name === path[index] && index !== path.length - 1) {
                return findItem(item.children, path, index + 1)
            } else if (item.name === path[index] && index === path.length - 1) {
                return item
            }
        }
        return null
    }

    const item = findItem(docsQuery.data || [], pathArray, 0)

    return (
        <h1 className="text-base font-medium">{item?.title || "Doclific"}</h1>
    )
}