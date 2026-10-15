"use client"

import { useEffect, useState, type CSSProperties } from "react"
import Link from "next/link"
import { IconBrandGithub, IconMenu2, IconX } from "@tabler/icons-react"
import { Button } from "../ui/button"
import { AlephLogo } from "../ui/aleph-logo"
import { SITE, downloadHref } from "../../_lib/site"
import { usePlatform } from "../../_lib/use-platform"
import { cn } from "../../_lib/utils"

type NavLink = { href: string; label: string; external?: boolean }

// const LINKS: ReadonlyArray<NavLink> = [
//   { href: "#features", label: "Features" },
//   { href: "#how-it-works", label: "How it works" },
//   { href: "#pricing", label: "Pricing" },
//   { href: "/docs", label: "Docs" },
//   { href: "#download", label: "Download" },
//   { href: "#faq", label: "FAQs" },
// ];

export function SiteNav({ stars }: { stars: number }) {
  const [scrolled, setScrolled] = useState(false)
  const [open, setOpen] = useState(false)
  const platform = usePlatform()

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
      <div className="mx-auto flex h-16 w-full max-w-360 items-center justify-between gap-4 px-5 sm:px-8 lg:px-12 xl:px-[140px]">
        <Link href="/" aria-label="Aleph home" className="shrink-0">
          <AlephLogo />
        </Link>

        {/* <nav
          aria-label="Primary"
          className="hidden flex-1 items-center justify-center gap-5 xl:gap-8 lg:flex"
        >
          {LINKS.map((l) => (
            <Link
              key={l.href}
              href={l.href}
              target={l.external ? "_blank" : undefined}
              rel={l.external ? "noopener noreferrer" : undefined}
              className="nav-link text-[15px] leading-6 text-muted-foreground hover:text-foreground"
            >
              {l.label}
            </Link>
          ))}
        </nav> */}

        {/* <div className="hidden shrink-0 items-center gap-2 lg:flex">
          <Button
            href={SITE.repo.url}
            variant="secondary"
            size="md"
            aria-label={`Aleph on GitHub, ${stars} stars`}
          >
            <IconBrandGithub size={16} aria-hidden stroke={2} />
            <span>
              GitHub{" "}
              <span className="text-muted-foreground">
                • {formatStars(stars)}
              </span>
            </span>
          </Button>
          <Button href={downloadHref(platform)} variant="primary" size="md">
            Download
          </Button>
        </div> */}

        {/* <button
          type="button"
          aria-expanded={open}
          aria-controls="mobile-nav"
          aria-label="Toggle menu"
          onClick={() => setOpen((v) => !v)}
          className="pressable border-border-strong inline-flex size-10 shrink-0 items-center justify-center rounded-full border text-foreground transition-[background-color,border-color] duration-160 ease-[cubic-bezier(0.23,1,0.32,1)] hover:bg-foreground/5 lg:hidden"
        >
          {open ? <IconX size={20} /> : <IconMenu2 size={20} />}
        </button> */}
      </div>

      <div
        id="mobile-nav"
        role="dialog"
        aria-modal="true"
        aria-label="Menu"
        aria-hidden={!open}
        inert={!open}
        data-closed={!open || undefined}
        style={{ "--transform-origin": "top center" } as CSSProperties}
        className="popover-animated fixed inset-x-0 top-16 z-40 border-t border-border bg-background/95 backdrop-blur-md data-[closed]:pointer-events-none data-[closed]:invisible lg:hidden"
      >
        {/* <div className="mx-auto flex max-w-360 flex-col gap-1 px-5 py-6 sm:px-8">
          {LINKS.map((l) => (
            <Link
              key={l.href}
              href={l.href}
              target={l.external ? "_blank" : undefined}
              rel={l.external ? "noopener noreferrer" : undefined}
              onClick={() => setOpen(false)}
              className="rounded-md px-3 py-3 text-lg text-foreground hover:bg-foreground/5"
            >
              {l.label}
            </Link>
          ))}
          <div className="mt-4 flex flex-col gap-2">
            <Button
              href={SITE.repo.url}
              variant="secondary"
              size="md"
              className="justify-center"
            >
              <IconBrandGithub size={16} aria-hidden stroke={2} />
              GitHub <span className="text-muted-foreground">• {formatStars(stars)}</span>
            </Button>
            <Button
              href={downloadHref(platform)}
              variant="primary"
              size="md"
              className="justify-center"
            >
              Download
            </Button>
          </div>
        </div> */}
      </div>
    </header>
  )
}

// function formatStars(n: number) {
//   if (n >= 1000) return `${(n / 1000).toFixed(1)}k`
//   return String(n)
// }
