import { ArrowRight } from "lucide-react"

import { Button } from "@/components/ui/button"
import { cn } from "@/lib/utils"

function BentoGrid({ children, className, ...props }) {
  return (
    <div
      className={cn("grid w-full auto-rows-[22rem] grid-cols-3 gap-4", className)}
      {...props}
    >
      {children}
    </div>
  )
}

function BentoCard({
  name,
  className,
  background,
  Icon,
  description,
  href,
  cta,
  ...props
}) {
  const IconComponent = Icon

  return (
    <div
      key={name}
      className={cn(
        "group relative col-span-3 flex flex-col justify-between overflow-hidden rounded-xl border border-white/70 bg-white/80 shadow-[0_18px_70px_-48px_rgba(15,23,42,0.5)] backdrop-blur-xl transition-all duration-300 ease-out",
        "hover:-translate-y-1 hover:border-primary/30 hover:bg-white/90 hover:shadow-[0_28px_90px_-48px_rgba(59,130,246,0.55)]",
        "dark:border-white/10 dark:bg-background/70 dark:hover:bg-background/80",
        className,
      )}
      {...props}
    >
      <div className="pointer-events-none absolute inset-0">{background}</div>
      <div className="pointer-events-none absolute inset-x-0 bottom-0 z-10 bg-gradient-to-t from-background via-background/95 to-transparent p-4 pt-12">
        <div className="flex transform-gpu flex-col gap-1 transition-all duration-300 lg:group-hover:-translate-y-7">
          <IconComponent className="h-9 w-9 origin-left transform-gpu text-primary transition-all duration-300 ease-in-out group-hover:scale-90" />
          <h3 className="text-lg font-semibold tracking-tight text-foreground">
            {name}
          </h3>
          <p className="max-w-lg text-sm leading-6 text-muted-foreground">
            {description}
          </p>
        </div>

        <div className="pointer-events-none flex w-full translate-y-0 transform-gpu flex-row items-center transition-all duration-300 group-hover:translate-y-0 group-hover:opacity-100 lg:hidden">
          <Button variant="link" asChild size="sm" className="pointer-events-auto p-0">
            <a href={href}>
              {cta}
              <ArrowRight className="ms-2 h-4 w-4 rtl:rotate-180" />
            </a>
          </Button>
        </div>
      </div>

      <div className="pointer-events-none absolute bottom-0 z-20 hidden w-full translate-y-8 transform-gpu flex-row items-center px-4 pb-4 opacity-0 transition-all duration-300 group-hover:translate-y-0 group-hover:opacity-100 lg:flex">
        <Button variant="link" asChild size="sm" className="pointer-events-auto p-0">
          <a href={href}>
            {cta}
            <ArrowRight className="ms-2 h-4 w-4 rtl:rotate-180" />
          </a>
        </Button>
      </div>

      <div className="pointer-events-none absolute inset-0 transform-gpu transition-all duration-300 group-hover:bg-black/3 group-hover:dark:bg-neutral-800/10" />
    </div>
  )
}

export { BentoCard, BentoGrid }
