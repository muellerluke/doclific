import { ThemeProvider } from "./components/theme-provider"
import Layout from "./layout"
import { Routes, Route } from "react-router"
import { toast, Toaster } from "sonner"
import Editor from "./pages/editor"
import { useQuery } from "@tanstack/react-query"
import { checkUpdate } from "./api/update"
import { useEffect } from "react"
import { NoDocSelected } from "./pages/no-doc-selected"
import { getPrefix } from "./api/codebase"


/**
 * Checks if the current version is newer than the latest version
 * @param currentVersion - The current version as a string in the format "vx.x.x"
 * @param latestVersion - The latest version as a string in the format "vx.x.x"
 * @returns True if the current version is newer than the latest version, false otherwise
 */
function isNewerVersion(currentVersion: string, latestVersion: string) {
  const normalize = (version: string) =>
    version
      .trim()
      .replace(/^v/i, "")
      .split(".")
      .map((part) => {
        const value = Number.parseInt(part, 10)
        return Number.isNaN(value) ? 0 : value
      })

  const currentParts = normalize(currentVersion)
  const latestParts = normalize(latestVersion)
  const maxLength = Math.max(currentParts.length, latestParts.length)

  for (let i = 0; i < maxLength; i += 1) {
    const currentPart = currentParts[i] ?? 0
    const latestPart = latestParts[i] ?? 0
    if (latestPart > currentPart) return true
    if (latestPart < currentPart) return false
  }

  return false
}

function App() {
  const updateCheckQuery = useQuery({
    queryKey: ["update", "check"],
    queryFn: () => checkUpdate(),
    retry: false,
  })

  useQuery({
    queryKey: ["codebase", "prefix"],
    queryFn: () => getPrefix(),
    enabled: true,
    retry: false
  })

  useEffect(() => {
    if (updateCheckQuery.isSuccess) {
      const { currentVersion, latestVersion } = updateCheckQuery.data
      if (isNewerVersion(currentVersion, latestVersion)) {
        toast.success(`Update available: ${currentVersion} -> ${latestVersion}. Please run 'doclific update' to install the latest version.`)
      }
    } else if (updateCheckQuery.isError) {
      toast.error(`Failed to check for updates: ${updateCheckQuery.error.message}`)
    }
  }, [updateCheckQuery.data, updateCheckQuery.isSuccess, updateCheckQuery.isError, updateCheckQuery.error])

  return (
    <ThemeProvider defaultTheme="dark" storageKey="vite-ui-theme">
      <Layout>
        <Routes>
          <Route path="/" element={<NoDocSelected />} />
          <Route path="/*" element={<Editor />} />
        </Routes>
      </Layout>
      <Toaster />
    </ThemeProvider>
  )
}

export default App
