import { AuthProvider } from "@/context/auth-context"
import { ThemeProvider } from "@/context/theme-context"
import { AppRouter } from "@/router"
import { Toaster } from "@/components/ui/sonner"

function App() {
  return (
    <ThemeProvider>
      <AuthProvider>
        <div className="relative min-h-screen">
          <AppRouter />
        </div>
        <Toaster position="top-right" />
      </AuthProvider>
    </ThemeProvider>
  )
}

export default App
