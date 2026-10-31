import * as React from "react"
import { Input as InputPrimitive } from "@base-ui/react/input"

import { cn } from "@/lib/utils"

function Input({ className, type, ...props }: React.ComponentProps<"input">) {
  return (
    <InputPrimitive
      type={type}
      data-slot="input"
      className={cn(
        "h-10 min-h-[40px] w-full min-w-0 rounded-md border border-zinc-800 bg-zinc-950 px-3 py-2 text-sm text-zinc-100 shadow-sm transition-colors outline-none file:inline-flex file:h-7 file:border-0 file:bg-transparent file:text-sm file:font-medium file:text-zinc-100 placeholder:text-zinc-400 focus-visible:border-emerald-500/80 focus-visible:ring-1 focus-visible:ring-emerald-500/80 disabled:pointer-events-none disabled:cursor-not-allowed disabled:opacity-50 aria-invalid:border-red-500 aria-invalid:ring-1 aria-invalid:ring-red-500",
        className
      )}
      {...props}
    />
  )
}

export { Input }
