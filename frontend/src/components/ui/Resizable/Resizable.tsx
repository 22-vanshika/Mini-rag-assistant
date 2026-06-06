import * as React from "react"
import * as ResizablePrimitive from "react-resizable-panels"

import { cn } from "@/lib/utils"

const ResizablePanelGroup = React.forwardRef<
  any,
  React.ComponentPropsWithoutRef<typeof ResizablePrimitive.Group> & {
    direction?: "horizontal" | "vertical"
  }
>(({ className, direction, orientation, ...props }, ref) => (
  <ResizablePrimitive.Group
    groupRef={ref as any}
    orientation={orientation || direction}
    data-slot="resizable-panel-group"
    className={cn(
      "flex h-full w-full aria-[orientation=vertical]:flex-col",
      className
    )}
    {...props}
  />
))
ResizablePanelGroup.displayName = "ResizablePanelGroup"

const ResizablePanel = React.forwardRef<
  any,
  React.ComponentPropsWithoutRef<typeof ResizablePrimitive.Panel>
>(({ ...props }, ref) => (
  <ResizablePrimitive.Panel
    panelRef={ref as any}
    data-slot="resizable-panel"
    {...props}
  />
))
ResizablePanel.displayName = "ResizablePanel"

const ResizableHandle = React.forwardRef<
  any,
  React.ComponentPropsWithoutRef<typeof ResizablePrimitive.Separator> & {
    withHandle?: boolean
  }
>(({ withHandle, className, ...props }, ref) => (
  <ResizablePrimitive.Separator
    elementRef={ref as any}
    data-slot="resizable-handle"
    className={cn(
      "relative flex w-1 items-center justify-center bg-border hover:bg-primary/40 transition-colors duration-200 cursor-col-resize group focus-visible:ring-1 focus-visible:ring-ring focus-visible:outline-hidden",
      "after:absolute after:inset-y-0 after:-left-2 after:w-5",
      className
    )}
    {...props}
  >
    {withHandle && (
      <div className="z-10 flex h-8 w-1.5 shrink-0 rounded-full bg-muted-foreground/30 group-hover:bg-primary group-focus-within:bg-primary transition-colors duration-200" />
    )}
  </ResizablePrimitive.Separator>
 ))
ResizableHandle.displayName = "ResizableHandle"

export { ResizableHandle, ResizablePanel, ResizablePanelGroup }
