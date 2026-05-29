import * as React from "react"
import { cn } from "../../lib/utils"
import { Tooltip, TooltipContent, TooltipTrigger } from "./tooltip"

export interface InputProps extends React.ComponentProps<"input"> {
  tooltip?: string | React.ReactNode
  tooltipSide?: "top" | "right" | "bottom" | "left"
}

const Input = React.forwardRef<HTMLInputElement, InputProps>(({ className, type, tooltip, tooltipSide, ...props }, ref) => {
  const input = (
    <input type={type} className={cn("flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-base shadow-sm transition-colors file:border-0 file:bg-transparent file:text-sm file:font-medium file:text-foreground placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring disabled:cursor-not-allowed disabled:opacity-50 md:text-sm", className)} ref={ref} {...props} />
  )

  if (tooltip) {
    return (
      <Tooltip>
        <TooltipTrigger asChild>
          {input}
        </TooltipTrigger>
        <TooltipContent side={tooltipSide} className="bg-black/90 text-white backdrop-blur-xl border-white/10 shadow-xl max-w-[200px] text-center">
          {tooltip}
        </TooltipContent>
      </Tooltip>
    )
  }

  return input
})
Input.displayName = "Input"

export { Input }