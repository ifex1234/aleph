"use client";

import { useState } from "react";
import { IconPlus } from "@tabler/icons-react";
import { Container } from "../ui/container";
import { Reveal } from "../ui/reveal";
import { SectionHeading } from "./section-heading";
import { cn } from "../../_lib/utils";
import { FAQS } from "./faq-section.data";

export function FaqSection() {
  // Good default: first answer visible so the list reads as
  // interactive on first paint — users discover the pattern instantly.
  const [openIndex, setOpenIndex] = useState<number | null>(0);

  return (
    <section
      id="faq"
      aria-labelledby="faq-heading"
      className="py-20 lg:py-[128px]"
    >
      <Container className="flex flex-col gap-10 md:gap-14 lg:gap-[52px]">
        <Reveal>
          <SectionHeading id="faq-heading">Questions, answered</SectionHeading>
        </Reveal>
        <Reveal>
          <dl
            className="flex flex-col"
            itemScope
            itemType="https://schema.org/FAQPage"
          >
            {FAQS.map((faq, i) => {
              const open = openIndex === i;
              const buttonId = `faq-button-${i}`;
              const panelId = `faq-panel-${i}`;
              return (
                <div
                  key={faq.question}
                  className={cn(i > 0 && "border-t border-border-strong")}
                  itemScope
                  itemProp="mainEntity"
                  itemType="https://schema.org/Question"
                >
                  <dt>
                    <button
                      type="button"
                      id={buttonId}
                      aria-expanded={open}
                      aria-controls={panelId}
                      onClick={() => setOpenIndex(open ? null : i)}
                      className="pressable group flex w-full items-center justify-between gap-6 py-8 text-left transition-[background-color] duration-200 ease-[cubic-bezier(0.23,1,0.32,1)] hover:bg-surface/60 active:bg-foreground/5 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent/60 focus-visible:ring-inset"
                    >
                      <span
                        itemProp="name"
                        className={cn(
                          "text-xl font-medium leading-8 tracking-[-0.02em] transition-[color] duration-200 ease md:text-2xl md:tracking-[-0.04em]",
                          open ? "text-foreground" : "text-foreground/90 group-hover:text-foreground"
                        )}
                      >
                        {faq.question}
                      </span>
                      <span
                        aria-hidden
                        className={cn(
                          "flex size-9 shrink-0 items-center justify-center rounded-full border transition-[transform,background-color,border-color] duration-200 ease-[cubic-bezier(0.23,1,0.32,1)]",
                          open
                            ? "border-accent/40 bg-accent/10 text-accent"
                            : "border-border-strong text-muted-foreground group-hover:border-foreground/20 group-hover:text-foreground"
                        )}
                        style={{
                          transform: open ? "rotate(45deg)" : "rotate(0deg)",
                        }}
                      >
                        <IconPlus size={18} stroke={2} />
                      </span>
                    </button>
                  </dt>
                  <dd
                    itemScope
                    itemProp="acceptedAnswer"
                    itemType="https://schema.org/Answer"
                    className="m-0"
                  >
                    <div
                      id={panelId}
                      role="region"
                      aria-labelledby={buttonId}
                      className={cn(
                        "grid transition-[grid-template-rows] duration-250 ease-[cubic-bezier(0.23,1,0.32,1)]",
                        open ? "grid-rows-[1fr]" : "grid-rows-[0fr]"
                      )}
                    >
                      <div className="min-h-0 overflow-hidden">
                        <p
                          className={cn(
                            "pb-8 pr-12 text-[17px] leading-6 tracking-[-0.01em] text-muted-foreground transition-[opacity,transform] duration-200 ease-[cubic-bezier(0.23,1,0.32,1)]",
                            open
                              ? "translate-y-0 opacity-100"
                              : "pointer-events-none -translate-y-1 opacity-0"
                          )}
                        >
                          <span itemProp="text">{faq.answer}</span>
                        </p>
                      </div>
                    </div>
                  </dd>
                </div>
              );
            })}
          </dl>
        </Reveal>
      </Container>
    </section>
  );
}
