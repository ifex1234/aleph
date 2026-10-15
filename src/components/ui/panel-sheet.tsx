"use client"

import * as React from "react"
import { Dialog as SheetPrimitive } from "radix-ui"

import { cn } from "@/lib/utils"

interface PanelSheetProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  title: string
  children: React.ReactNode
  className?: string
}

/**
 * Non-modal left-side sheet for the workspace panels (Notes, Lyrics, Hymns,
 * Slides). Unlike a modal dialog it never dims the UI or traps focus, so
 * the operator keeps working with the main panels while it is open.
 */
export function PanelSheet({
  open,
  onOpenChange,
  title,
  children,
  className,
}: PanelSheetProps) {
  return (
    <SheetPrimitive.Root modal={false} open={open} onOpenChange={onOpenChange}>
      <SheetPrimitive.Portal>
        <SheetPrimitive.Content
          data-slot="panel-sheet"
          onInteractOutside={(e) => e.preventDefault()}
          className={cn(
            "fixed inset-y-0 left-0 z-50 flex w-[24rem] max-w-[92vw] flex-col border-r border-border bg-card shadow-xl outline-none transition duration-200 ease-in-out data-open:animate-in data-open:fade-in-0 data-open:slide-in-from-left-10 data-closed:animate-out data-closed:fade-out-0 data-closed:slide-out-to-left-10",
            className
          )}
        >
          <SheetPrimitive.Title className="sr-only">
            {title}
          </SheetPrimitive.Title>
          {children}
        </SheetPrimitive.Content>
      </SheetPrimitive.Portal>
    </SheetPrimitive.Root>
  )
}
