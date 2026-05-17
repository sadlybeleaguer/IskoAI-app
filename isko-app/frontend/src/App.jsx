import { AuthProvider } from "@/context/auth-context"
import { ThemeProvider } from "@/context/theme-context"
import { AppRouter } from "@/router"
import { Toaster } from "@/components/ui/sonner"

function App() {
  return (
    <ThemeProvider>
      <AuthProvider>
        <AppRouter />
        <Toaster position="top-right" />
      </AuthProvider>
    </ThemeProvider>
  )
}

export default App
