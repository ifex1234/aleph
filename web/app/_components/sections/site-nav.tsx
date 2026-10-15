"use client"

import { useEffect, useState } from "react"
import Link from "next/link"
import { AlephLogo } from "../ui/aleph-logo"
import { cn } from "../../_lib/utils"

export function SiteNav() {
  const [scrolled, setScrolled] = useState(false)
  const [open, setOpen] = useState(false)

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 8)
    onScroll()
    window.addEventListener("scroll", onScroll, { passive: true })
    return () => window.removeEventListener("scroll", onScroll)
  }, [])

  useEffect(() => {
    document.body.style.overflow = open ? "hidden" : ""
    return () => {
      document.body.style.overflow = ""
    }
  }, [open])

  useEffect(() => {
    if (!open) return
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setOpen(false)
    }
    document.addEventListener("keydown", onKey)
    return () => document.removeEventListener("keydown", onKey)
  }, [open])

  return (
    <header
      className={cn(
        "sticky top-0 z-50 w-full transition-[background-color,border-color,backdrop-filter] duration-200 ease-[cubic-bezier(0.23,1,0.32,1)]",
        scrolled
          ? "border-b border-border bg-background/80 backdrop-blur-md"
          : "border-b border-transparent bg-background/0"
      )}
    >
      <div className="mx-auto flex h-16 w-full max-w-360 items-center justify-between gap-4 px-5 sm:px-8 lg:px-12 xl:px-35">
        <Link href="/" aria-label="Aleph home" className="shrink-0">
          <AlephLogo />
        </Link>
      </div>
    </header>
  )
}
