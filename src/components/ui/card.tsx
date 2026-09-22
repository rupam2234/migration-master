import * as React from "react"
import { cva, type VariantProps } from "class-variance-authority"

import { cn } from "@/lib/utils"

const cardVariants = cva(
  "rounded-sm border bg-card text-card-foreground shadow-sm transition-all duration-200 hover:shadow-md",
  {
    variants: {
      variant: {
        default: "",
        outline: "border-2 border-border",
      },
    },
    defaultVariants: {
      variant: "default",
    },
  }
)

const cardHeaderVariants = cva(
  "flex flex-col space-y-1.5 p-6 pb-0",
  {
    variants: {
      size: {
        default: "p-6",
        sm: "p-4",
      },
    },
    defaultVariants: {
      size: "default",
    },
  }
)

const cardTitleVariants = cva(
  "text-lg font-semibold leading-none tracking-tight",
  {
    variants: {
      size: {
        default: "text-lg",
        sm: "text-base",
      },
    },
    defaultVariants: {
      size: "default",
    },
  }
)

const cardDescriptionVariants = cva(
  "text-sm text-muted-foreground",
  {
    variants: {
      size: {
        default: "text-sm",
        sm: "text-xs",
      },
    },
    defaultVariants: {
      size: "default",
    },
  }
)

const cardContentVariants = cva(
  "p-6 pt-0",
  {
    variants: {
      size: {
        default: "p-6",
        sm: "p-4",
      },
    },
    defaultVariants: {
      size: "default",
    },
  }
)

const cardFooterVariants = cva(
  "flex items-center justify-between p-6 pt-0",
  {
    variants: {
      size: {
        default: "p-6",
        sm: "p-4",
      },
    },
    defaultVariants: {
      size: "default",
    },
  }
)

export interface CardProps
  extends React.HTMLAttributes<HTMLDivElement>,
    VariantProps<typeof cardVariants> {}

export const Card = React.forwardRef<HTMLDivElement, CardProps>(
  ({ className, variant, ...props }, ref) => (
    <div
      ref={ref}
      className={cn(cardVariants({ variant, className }))}
      {...props}
    />
  )
)
Card.displayName = "Card"

export const CardHeader = React.forwardRef<
  HTMLDivElement,
  React.HTMLAttributes<HTMLDivElement> & VariantProps<typeof cardHeaderVariants>
>(({ className, size, ...props }, ref) => (
  <div
    ref={ref}
    className={cn(cardHeaderVariants({ size, className }))}
    {...props}
  />
))
CardHeader.displayName = "CardHeader"

export const CardTitle = React.forwardRef<
  HTMLParagraphElement,
  React.HTMLAttributes<HTMLHeadingElement> & VariantProps<typeof cardTitleVariants>
>(({ className, size, ...props }, ref) => (
  <h3
    ref={ref}
    className={cn(cardTitleVariants({ size, className }))}
    {...props}
  />
))
CardTitle.displayName = "CardTitle"

export const CardDescription = React.forwardRef<
  HTMLParagraphElement,
  React.HTMLAttributes<HTMLParagraphElement> & VariantProps<typeof cardDescriptionVariants>
>(({ className, size, ...props }, ref) => (
  <p
    ref={ref}
    className={cn(cardDescriptionVariants({ size, className }))}
    {...props}
  />
))
CardDescription.displayName = "CardDescription"

export const CardContent = React.forwardRef<
  HTMLDivElement,
  React.HTMLAttributes<HTMLDivElement> & VariantProps<typeof cardContentVariants>
>(({ className, size, ...props }, ref) => (
  <div
    ref={ref}
    className={cn(cardContentVariants({ size, className }))}
    {...props}
  />
))
CardContent.displayName = "CardContent"

export const CardFooter = React.forwardRef<
  HTMLDivElement,
  React.HTMLAttributes<HTMLDivElement> & VariantProps<typeof cardFooterVariants>
>(({ className, size, ...props }, ref) => (
  <div
    ref={ref}
    className={cn(cardFooterVariants({ size, className }))}
    {...props}
  />
))
CardFooter.displayName = "CardFooter"