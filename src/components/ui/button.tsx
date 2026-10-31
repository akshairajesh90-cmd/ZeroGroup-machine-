import { Button as ButtonPrimitive } from "@base-ui/react/button"
import { cva, type VariantProps } from "class-variance-authority"

import { cn } from "@/lib/utils"

const buttonVariants = cva(
  "group/button inline-flex shrink-0 items-center justify-center rounded-md border border-transparent bg-clip-padding font-medium whitespace-nowrap transition-all outline-none select-none focus-visible:border-ring focus-visible:ring-2 focus-visible:ring-emerald-500/50 active:not-aria-[haspopup]:translate-y-px disabled:pointer-events-none disabled:opacity-50 aria-invalid:border-destructive aria-invalid:ring-2 aria-invalid:ring-destructive/20 [&_svg]:pointer-events-none [&_svg]:shrink-0 [&_svg:not([class*='size-'])]:size-4",
  {
    variants: {
      variant: {
        default:
          "bg-zinc-100 text-zinc-950 hover:bg-zinc-200 active:bg-zinc-300 shadow-sm font-semibold dark:bg-zinc-100 dark:text-zinc-950 dark:hover:bg-zinc-200",
        outline:
          "border border-zinc-700 bg-transparent text-zinc-100 hover:bg-zinc-800 hover:text-white aria-expanded:bg-zinc-800",
        secondary:
          "bg-zinc-800/90 text-zinc-100 border border-zinc-700/80 hover:bg-zinc-700 hover:text-white active:bg-zinc-600 shadow-sm",
        ghost:
          "text-zinc-300 hover:bg-zinc-800 hover:text-white aria-expanded:bg-zinc-800",
        destructive:
          "bg-red-600 text-white hover:bg-red-500 focus-visible:ring-red-500/40 shadow-sm",
        link: "text-emerald-400 underline-offset-4 hover:underline",
      },
      size: {
        default: "h-10 min-h-[40px] gap-2 px-4 text-sm font-semibold rounded-md",
        sm: "h-8 min-h-[32px] gap-1.5 px-3 text-xs font-semibold rounded-md [&_svg:not([class*='size-'])]:size-3.5",
        xs: "h-7 min-h-[28px] gap-1 px-2 text-xs font-medium rounded-md [&_svg:not([class*='size-'])]:size-3",
        lg: "h-11 min-h-[44px] gap-2.5 px-6 text-base font-semibold rounded-md",
        icon: "size-10 min-w-[40px] min-h-[40px] rounded-md",
        "icon-sm": "size-8 min-w-[32px] min-h-[32px] rounded-md",
        "icon-xs": "size-7 min-w-[28px] min-h-[28px] rounded-md [&_svg:not([class*='size-'])]:size-3",
        "icon-lg": "size-11 min-w-[44px] min-h-[44px] rounded-md",
      },
    },
    defaultVariants: {
      variant: "default",
      size: "default",
    },
  }
)

function Button({
  className,
  variant = "default",
  size = "default",
  ...props
}: ButtonPrimitive.Props & VariantProps<typeof buttonVariants>) {
  return (
    <ButtonPrimitive
      data-slot="button"
      className={cn(buttonVariants({ variant, size, className }))}
      {...props}
    />
  )
}

export { Button, buttonVariants }
