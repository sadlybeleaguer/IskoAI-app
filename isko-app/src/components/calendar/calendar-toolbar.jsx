import { ChevronLeft, ChevronRight } from "lucide-react"

import { Button } from "@/components/ui/button"

export function CalendarToolbar({
  currentMonthLabel,
  onGoToNextMonth,
  onGoToPreviousMonth,
  onGoToToday,
}) {
  return (
    <div className="flex flex-wrap items-center justify-between gap-3">
      <div className="flex items-center gap-2">
        <Button
          type="button"
          variant="outline"
          size="icon-sm"
          onClick={onGoToPreviousMonth}
        >
          <ChevronLeft data-icon="inline-start" />
        </Button>
        <Button
          type="button"
          variant="outline"
          size="icon-sm"
          onClick={onGoToNextMonth}
        >
          <ChevronRight data-icon="inline-start" />
        </Button>
        <Button type="button" variant="outline" onClick={onGoToToday}>
          Today
        </Button>
      </div>

      <div className="text-sm font-medium">{currentMonthLabel}</div>
    </div>
  )
}
