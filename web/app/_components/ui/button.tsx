import * as React from "react";
import Link from "next/link";
import { cn } from "../../_lib/utils";

type Variant = "primary" | "secondary" | "ghost";
type Size = "md" | "lg";

type Common = {
  variant?: Variant;
  size?: Size;
  className?: string;
  children: React.ReactNode;
};

type AsButton = Common &
  Omit<React.ButtonHTMLAttributes<HTMLButtonElement>, "size" | "children"> & {
    href?: undefined;
  };

type AsLink = Common &
  Omit<React.AnchorHTMLAttributes<HTMLAnchorElement>, "size" | "children"> & {
    href: string;
  };

type ButtonProps = AsButton | AsLink;

const base =
  "pressable lift-hover inline-flex items-center justify-center gap-[10px] rounded-full whitespace-nowrap font-medium tracking-[-0.3px] transition-[transform,background-color,color,border-color,box-shadow] duration-200 ease-[cubic-bezier(0.23,1,0.32,1)] will-change-transform active:scale-[0.97] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent/60 focus-visible:ring-offset-2 focus-visible:ring-offset-background disabled:pointer-events-none disabled:opacity-60";

const sizes: Record<Size, string> = {
  md: "px-[14px] py-[6px] text-[15px] leading-6",
  lg: "px-4 py-[6px] text-[18px] leading-6",
};

const variants: Record<Variant, string> = {
  primary:
    "bg-primary text-primary-foreground shadow-[0_1px_2px_rgba(220,38,38,0.24)] hover:bg-primary/90 hover:shadow-[0_4px_16px_rgba(220,38,38,0.28)]",
  secondary:
    "bg-surface-strong text-foreground hover:bg-foreground/10 hover:border-border-strong",
  ghost:
    "border border-border-strong bg-transparent text-foreground hover:bg-foreground/5",
};

export function Button({
  variant = "primary",
  size = "md",
  className,
  children,
  ...rest
}: ButtonProps) {
  const classes = cn(base, sizes[size], variants[variant], className);

  if ("href" in rest && rest.href) {
    const { href, target, rel, download, ...anchorRest } = rest as AsLink;
    if (download !== undefined) {
      // File downloads stay in the same tab (no target="_blank"): the
      // browser handles the attachment response as a download, so the
      // visitor never leaves the page for GitHub.
      return (
        <a
          href={href}
          download={download}
          className={classes}
          {...anchorRest}
        >
          {children}
        </a>
      );
    }
    const isExternal = /^https?:\/\//.test(href);
    if (isExternal) {
      return (
        <a
          href={href}
          target={target ?? "_blank"}
          rel={rel ?? "noopener noreferrer"}
          className={classes}
          {...anchorRest}
        >
          {children}
        </a>
      );
    }
    return (
      <Link href={href} className={classes} {...anchorRest}>
        {children}
      </Link>
    );
  }

  const { type = "button", ...buttonRest } = rest as AsButton;
  return (
    <button type={type} className={classes} {...buttonRest}>
      {children}
    </button>
  );
}
