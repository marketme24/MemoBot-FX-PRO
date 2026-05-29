import * as React from "react"
import * as SwitchPrimitives from "@radix-ui/react-switch"
import { cn } from "../../lib/utils"
import { Tooltip, TooltipContent, TooltipTrigger } from "./tooltip"

export interface SwitchProps extends React.ComponentPropsWithoutRef<typeof SwitchPrimitives.Root> {
  tooltip?: string | React.ReactNode
  tooltipSide?: "top" | "right" | "bottom" | "left"
}

const Switch = React.forwardRef<React.ElementRef<typeof SwitchPrimitives.Root>, SwitchProps>(({ className, tooltip, tooltipSide, ...props }, ref) => {
  const switchNode = (
    <SwitchPrimitives.Root className={cn("peer inline-flex h-5 w-9 shrink-0 cursor-pointer items-center rounded-full border-2 border-transparent shadow-sm transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background disabled:cursor-not-allowed disabled:opacity-50 data-[state=checked]:bg-primary data-[state=unchecked]:bg-input", className)} {...props} ref={ref}>
      <SwitchPrimitives.Thumb className={cn("pointer-events-none block h-4 w-4 rounded-full bg-background shadow-lg ring-0 transition-transform data-[state=checked]:translate-x-4 data-[state=unchecked]:translate-x-0")} />
    </SwitchPrimitives.Root>
  )

  if (tooltip) {
    return (
      <Tooltip>
        <TooltipTrigger asChild>
          {switchNode}
        </TooltipTrigger>
        <TooltipContent side={tooltipSide} className="bg-black/90 text-white backdrop-blur-xl border-white/10 shadow-xl text-center">
          {tooltip}
        </TooltipContent>
      </Tooltip>
    )
  }

  return switchNode
})
Switch.displayName = SwitchPrimitives.Root.displayName

export { Switch }