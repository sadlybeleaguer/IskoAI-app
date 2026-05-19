import { AuthProvider } from "@/context/auth-context"
import { ThemeProvider } from "@/context/theme-context"
import { AppRouter } from "@/router"
import { Pointer } from "@/components/ui/pointer"
import { Toaster } from "@/components/ui/sonner"

function App() {
  return (
    <ThemeProvider>
      <AuthProvider>
        <div className="relative min-h-screen [@media(pointer:coarse)]:cursor-auto">
          <AppRouter />
          <Pointer>
            <svg
              aria-hidden="true"
              className="h-6 w-6 rotate-[-70deg] drop-shadow-[0_6px_14px_rgba(37,99,235,0.35)]"
              fill="url(#isko-pointer-gradient)"
              stroke="white"
              strokeWidth="1.2"
              viewBox="0 0 16 16"
              xmlns="http://www.w3.org/2000/svg"
            >
              <defs>
                <linearGradient
                  id="isko-pointer-gradient"
                  x1="2"
                  x2="14"
                  y1="2"
                  y2="14"
                  gradientUnits="userSpaceOnUse"
                >
                  <stop stopColor="#2563eb" />
                  <stop offset="0.52" stopColor="#3b82f6" />
                  <stop offset="1" stopColor="#93c5fd" />
                </linearGradient>
              </defs>
              <path d="M14.082 2.182a.5.5 0 0 1 .103.557L8.528 15.467a.5.5 0 0 1-.917-.007L5.57 10.694.803 8.652a.5.5 0 0 1-.006-.916l12.728-5.657a.5.5 0 0 1 .556.103z" />
            </svg>
          </Pointer>
        </div>
        <Toaster position="top-right" />
      </AuthProvider>
    </ThemeProvider>
  )
}

export default App
