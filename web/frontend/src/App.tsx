import { ThemeProvider } from "./components/theme-provider"
import Layout from "./layout"
import { Routes, Route } from "react-router"
import { Toaster } from "sonner"
import Editor from "./pages/editor"

function App() {
  return (
    <ThemeProvider defaultTheme="dark" storageKey="vite-ui-theme">
      <Layout>
        <Routes>
          <Route path="/" element={<div></div>} />
          <Route path="/*" element={<Editor />} />
        </Routes>
      </Layout>
      <Toaster />
    </ThemeProvider>
  )
}

export default App
