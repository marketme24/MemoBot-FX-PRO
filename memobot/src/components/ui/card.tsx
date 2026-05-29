import * as React from "react"
import { cn } from "../../lib/utils"
import { Tooltip, TooltipContent, TooltipTrigger } from "./tooltip"

export interface CardProps extends React.HTMLAttributes<HTMLDivElement> {
  tooltip?: string | React.ReactNode
  tooltipSide?: "top" | "right" | "bottom" | "left"
}

const Card = React.forwardRef<HTMLDivElement, CardProps>(({ className, tooltip, tooltipSide, ...props }, ref) => {
  const card = (
    <div ref={ref} className={cn("rounded-2xl border bg-card text-card-foreground shadow-sm", className)} {...props} />
  )

  if (tooltip) {
    return (
      <Tooltip>
        <TooltipTrigger asChild>
          {card}
        </TooltipTrigger>
        <TooltipContent side={tooltipSide} className="bg-black/90 text-white backdrop-blur-xl border-white/10 shadow-xl max-w-sm">
          {tooltip}
        </TooltipContent>
      </Tooltip>
    )
  }

  return card
})
Card.displayName = "Card"

const CardHeader = React.forwardRef<HTMLDivElement, React.HTMLAttributes<HTMLDivElement>>(({ className, ...props }, ref) => (
  <div ref={ref} className={cn("flex flex-col space-y-1.5 p-6", className)} {...props} />
))
CardHeader.displayName = "CardHeader"

const CardTitle = React.forwardRef<HTMLDivElement, React.HTMLAttributes<HTMLDivElement>>(({ className, ...props }, ref) => (
  <h3 ref={ref} className={cn("text-2xl font-semibold leading-none tracking-tight", className)} {...props} />
))
CardTitle.displayName = "CardTitle"

const CardDescription = React.forwardRef<HTMLDivElement, React.HTMLAttributes<HTMLDivElement>>(({ className, ...props }, ref) => (
  <p ref={ref} className={cn("text-sm text-muted-foreground", className)} {...props} />
))
CardDescription.displayName = "CardDescription"

const CardContent = React.forwardRef<HTMLDivElement, React.HTMLAttributes<HTMLDivElement>>(({ className, ...props }, ref) => (
  <div ref={ref} className={cn("p-6 pt-0", className)} {...props} />
))
CardContent.displayName = "CardContent"

const CardFooter = React.forwardRef<HTMLDivElement, React.HTMLAttributes<HTMLDivElement>>(({ className, ...props }, ref) => (
  <div ref={ref} className={cn("flex items-center p-6 pt-0", className)} {...props} />
))
CardFooter.displayName = "CardFooter"

export { Card, CardHeader, CardFooter, CardTitle, CardDescription, CardContent }