import type { Icon as TablerIcon } from "@tabler/icons-react";
import { cn } from "../../_lib/utils";

export function FeatureCard({
  icon: Icon,
  title,
  body,
  iconTone = "default",
  className,
}: {
  icon: TablerIcon;
  title: string;
  body: string;
  iconTone?: "default" | "accent";
  className?: string;
}) {
  return (
    <div
      className={cn(
        "group relative flex h-full w-full flex-col items-center gap-4 border border-border bg-background p-8 text-center transition-[background-color,border-color] duration-200 ease-[cubic-bezier(0.23,1,0.32,1)] hover:bg-surface hover:border-border-strong md:p-10",
        className
      )}
    >
      <Icon
        size={32}
        stroke={1.75}
        aria-hidden
        className={cn(
          "group-icon shrink-0 transition-transform duration-200 ease-[cubic-bezier(0.23,1,0.32,1)]",
          iconTone === "accent" ? "text-accent" : "text-foreground"
        )}
      />
      <div className="flex flex-col gap-2">
        <h3 className="text-lg font-medium leading-6 tracking-[-0.01em] text-foreground">
          {title}
        </h3>
        <p className="text-lg leading-6 tracking-[-0.01em] text-muted-foreground">
          {body}
        </p>
      </div>
    </div>
  );
}
