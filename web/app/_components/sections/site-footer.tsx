import Link from "next/link"
import {
  IconBrandApple,
  IconBrandGithub,
  IconBrandLinkedin,
  IconBrandWindows,
  IconBrandX,
  IconMail,
} from "@tabler/icons-react"
import { Container } from "../ui/container"
import { AlephLogo } from "../ui/aleph-logo"
import { SITE } from "../../_lib/site"

const GROUPS = [
  {
    heading: "Product",
    links: [
      { label: "Features", href: "#features" },
      { label: "How it works", href: "#how-it-works" },
      { label: "Pricing", href: "#pricing" },
      { label: "Testimonials", href: "#testimonials" },
    ],
  },
  // {
  //   heading: "Socials",
  //   links: [
  //     { label: "GitHub", href: SITE.socials.github, external: true },
  //     { label: "Email", href: SITE.socials.email },
  //     { label: "X (Twitter)", href: SITE.socials.twitter, external: true },
  //     { label: "LinkedIn", href: SITE.socials.linkedin, external: true },
  //   ],
  // },
  {
    heading: "Legal",
    links: [
      { label: "Privacy Policy", href: "/privacy" },
      { label: "Terms of Service", href: "/terms" },
    ],
  },
]

export function SiteFooter() {
  return (
    <footer className="border-t border-border py-20 lg:py-25">
      <Container>
        <div className="grid grid-cols-1 gap-12 md:grid-cols-[minmax(0,1.4fr)_repeat(3,minmax(0,1fr))] md:gap-8">
          <div className="flex flex-col gap-3">
            <AlephLogo />
            <p className="max-w-70 text-lg leading-6 tracking-[-0.01em] text-muted-foreground">
              Open-source worship presentation: live scripture, hymns and
              song on every screen.
            </p>
          </div>
          {GROUPS.map((g) => (
            <nav
              key={g.heading}
              aria-label={g.heading}
              className="flex flex-col gap-2.5"
            >
              <h4 className="text-[15px] leading-6 text-foreground">
                {g.heading}
              </h4>
              <ul className="flex flex-col gap-2.5">
                {g.links.map((l) => (
                  <li key={l.label}>
                    <FooterLink href={l.href}>{l.label}</FooterLink>
                  </li>
                ))}
              </ul>
            </nav>
          ))}
        </div>
        <div className="text-subtle-foreground mt-12 flex flex-col items-start justify-between gap-4 border-t border-border pt-8 text-[13px] leading-5 md:flex-row md:items-center">
          <p>
            © {new Date().getFullYear()} Zeravest Technologies. All rights
            reserved.
          </p>
          {/* <div className="flex items-center gap-4">
            <a
              href={SITE.socials.github}
              aria-label="GitHub"
              target="_blank"
              rel="noopener noreferrer"
              className="text-muted-foreground transition-colors hover:text-foreground"
            >
              <IconBrandGithub size={18} stroke={2} />
            </a>
            <a
              href={SITE.socials.twitter}
              aria-label="X (Twitter)"
              target="_blank"
              rel="noopener noreferrer"
              className="text-muted-foreground transition-colors hover:text-foreground"
            >
              <IconBrandX size={18} stroke={2} />
            </a>
            <a
              href={SITE.socials.linkedin}
              aria-label="LinkedIn"
              target="_blank"
              rel="noopener noreferrer"
              className="text-muted-foreground transition-colors hover:text-foreground"
            >
              <IconBrandLinkedin size={18} stroke={2} />
            </a>
            <a
              href={SITE.socials.email}
              aria-label="Email"
              className="text-muted-foreground transition-colors hover:text-foreground"
            >
              <IconMail size={18} stroke={2} />
            </a>
          </div> */}
        </div>
      </Container>
    </footer>
  )
}

function FooterLink({
  href,
  external,
  children,
}: {
  href: string
  external?: boolean
  children: React.ReactNode
}) {
  const className =
    "text-[15px] leading-6 text-muted-foreground transition-colors hover:text-foreground"
  if (external || /^https?:|^mailto:/.test(href)) {
    return (
      <a
        href={href}
        target={external ? "_blank" : undefined}
        rel={external ? "noopener noreferrer" : undefined}
        className={className}
      >
        {children}
      </a>
    )
  }
  return (
    <Link href={href} className={className}>
      {children}
    </Link>
  )
}
