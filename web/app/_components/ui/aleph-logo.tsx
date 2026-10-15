import { cn } from "../../_lib/utils"
import logo from "../../../public/brand/aleph-mark.svg"
import Image from "next/image"

export function AlephLogo({
  className,
  wordmarkClassName,
  size = "md",
}: {
  className?: string
  wordmarkClassName?: string
  size?: "sm" | "md" | "lg"
}) {
  const iconSize =
    size === "sm" ? "size-6" : size === "lg" ? "size-10" : "size-[34px]"
  const textSize =
    size === "sm"
      ? "text-lg tracking-[-0.6px] leading-6"
      : size === "lg"
        ? "text-[28px] tracking-[-1px] leading-[36px]"
        : "text-2xl tracking-[-0.8px] leading-[32px]"

  return (
    <span className={cn("inline-flex items-center gap-1", className)}>
      <span
        className={cn(
          "flex items-center justify-center text-foreground",
          iconSize
        )}
        aria-hidden
      >
        <Image src={logo} alt="Aleph Logo" className="mx-3 h-full w-full" />
      </span>
      <span
        className={cn(
          "font-medium text-foreground",
          textSize,
          wordmarkClassName
        )}
      >
        Aleph
      </span>
    </span>
  )
}
