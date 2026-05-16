import { Monitor, Moon, Settings, Sun } from "lucide-react"

import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group"
import { useTheme } from "@/context/theme-context"
import { cn } from "@/utils/cn"

const themeOptions = [
  {
    value: "light",
    label: "Light",
    icon: Sun,
    description: "Bright workspace",
  },
  {
    value: "dark",
    label: "Dark",
    icon: Moon,
    description: "OLED depth",
  },
  {
    value: "system",
    label: "System",
    icon: Monitor,
    description: "Match device",
  },
]

function formatThemeLabel(value) {
  return value.charAt(0).toUpperCase() + value.slice(1)
}

export function SettingsDialog({ onOpenChange, open }) {
  const { resolvedTheme, setThemeMode, systemTheme, themeMode } = useTheme()

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="settings-dialog-grain overflow-hidden p-0 sm:max-w-xl">
        <div className="relative border-b border-border/70 bg-card px-5 py-5">
          <div className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-primary/50 to-transparent" />
          <DialogHeader className="max-w-md pr-8">
            <div className="mb-2 flex size-10 items-center justify-center rounded-lg border border-border bg-background text-primary shadow-sm shadow-primary/10">
              <Settings data-icon="inline-start" />
            </div>
            <DialogTitle>Settings</DialogTitle>
            <DialogDescription>
              Tune the workspace appearance for this browser.
            </DialogDescription>
          </DialogHeader>
        </div>

        <div className="flex flex-col gap-5 px-5 pb-5 pt-4">
          <section className="flex flex-col gap-3">
            <div className="flex flex-col gap-1">
              <h2 className="text-sm font-medium">Appearance</h2>
              <p className="text-sm text-muted-foreground">
                Choose a theme or follow your device setting.
              </p>
            </div>

            <ToggleGroup
              type="single"
              value={themeMode}
              onValueChange={(nextMode) => {
                if (nextMode) {
                  setThemeMode(nextMode)
                }
              }}
              className="grid w-full grid-cols-3"
              aria-label="Theme mode"
            >
              {themeOptions.map((option) => {
                const Icon = option.icon
                const isSelected = themeMode === option.value

                return (
                  <ToggleGroupItem
                    key={option.value}
                    value={option.value}
                    aria-label={`${option.label} theme`}
                    className={cn(
                      "h-auto flex-col items-start gap-2 px-3 py-3 text-left",
                      isSelected && "ring-1 ring-primary/25",
                    )}
                  >
                    <span className="flex w-full items-center gap-2">
                      <Icon data-icon="inline-start" />
                      <span>{option.label}</span>
                    </span>
                    <span className="text-xs font-normal text-muted-foreground">
                      {option.description}
                    </span>
                  </ToggleGroupItem>
                )
              })}
            </ToggleGroup>
          </section>

          <div className="rounded-lg border border-border/70 bg-muted/35 px-4 py-3 text-sm">
            <p className="font-medium text-foreground">
              Active theme: {formatThemeLabel(resolvedTheme)}
            </p>
            <p className="mt-1 text-muted-foreground">
              System currently resolves to {systemTheme}; your selected mode is{" "}
              {themeMode}.
            </p>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}
