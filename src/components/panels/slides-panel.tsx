import { useRef } from "react"
import { PanelHeader } from "@/components/ui/panel-header"
import { Button } from "@/components/ui/button"
import { ScrollArea } from "@/components/ui/scroll-area"
import { Separator } from "@/components/ui/separator"
import {
  ChevronDownIcon,
  ChevronLeftIcon,
  ChevronRightIcon,
  ChevronUpIcon,
  FileTextIcon,
  ImagesIcon,
  PlusIcon,
  Trash2Icon,
} from "lucide-react"
import { cn } from "@/lib/utils"
import {
  kindFromMimeType,
  resolveSlideKind,
  useSlidesStore,
} from "@/stores/slides-store"
import { useBroadcastStore } from "@/stores/broadcast-store"
import { slideActions } from "@/hooks/use-slides"

const ACCEPTED_TYPES = [
  "image/png",
  "image/jpeg",
  "image/webp",
  "image/gif",
  "image/bmp",
  "image/svg+xml",
  "video/mp4",
  "video/webm",
  "video/quicktime",
  "video/ogg",
  "application/pdf",
]

const ACCEPT_ATTR =
  "image/png,image/jpeg,image/webp,image/gif,image/bmp,image/svg+xml,video/mp4,video/webm,video/quicktime,video/ogg,application/pdf"

/** Slides persist as data URLs — refuse files that would bloat storage/broadcast. */
const MAX_FILE_BYTES = 100 * 1024 * 1024

function fileToDataUrl(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.onload = () => resolve(reader.result as string)
    reader.onerror = reject
    reader.readAsDataURL(file)
  })
}

export function SlidesPanel() {
  const { isSidebarOpen, setSidebarOpen } = useSlidesStore()
  const slides = useSlidesStore((s) => s.slides)
  const presentedSlideId = useBroadcastStore((s) =>
    s.activeContentType === "slides" && s.slidesContent
      ? (s.slidesContent.slides[s.slidesContent.currentSlideIndex]?.id ?? null)
      : null
  )
  const fileInputRef = useRef<HTMLInputElement>(null)

  const handleFiles = async (files: File[]) => {
    const validFiles = files.filter((f) => ACCEPTED_TYPES.includes(f.type))
    if (validFiles.length !== files.length) {
      alert(
        "Some files were skipped. Supported: images (PNG, JPEG, WebP, GIF, BMP, SVG), videos (MP4, WebM, MOV, OGG), and PDF."
      )
    }
    const sizedFiles = validFiles.filter((f) => {
      if (f.size > MAX_FILE_BYTES) {
        alert(
          `"${f.name}" is too large (${(f.size / (1024 * 1024)).toFixed(0)} MB). Slides are limited to 100 MB per file.`
        )
        return false
      }
      return true
    })
    if (sizedFiles.length === 0) return
    const additions = await Promise.all(
      sizedFiles.map(async (file) => ({
        name: file.name.replace(/\.[^/.]+$/, ""),
        dataUrl: await fileToDataUrl(file),
        kind: kindFromMimeType(file.type, file.name),
        mimeType: file.type,
      }))
    )
    useSlidesStore.getState().addSlides(additions)
  }

  const present = (index: number) => {
    const { slides: deck } = useSlidesStore.getState()
    if (deck.length === 0) return
    slideActions.presentSlides(deck, index)
  }

  const isPresented = (id: string) => presentedSlideId === id

  return (
    <div
      data-slot="slides-panel"
      className="flex h-full w-full flex-col overflow-hidden bg-card"
    >
      <PanelHeader title="Slides" className="border-b border-border">
        <div className="flex items-center gap-2">
          <Button
            variant="ghost"
            size="icon-sm"
            onClick={() => setSidebarOpen(!isSidebarOpen)}
            className="-ml-1"
            aria-label={isSidebarOpen ? "Close slides panel" : "Open slides panel"}
          >
            {isSidebarOpen ? (
              <ChevronLeftIcon className="size-4" />
            ) : (
              <ChevronRightIcon className="size-4" />
            )}
          </Button>
          <Button
            variant="ghost"
            size="icon-sm"
            onClick={() => fileInputRef.current?.click()}
            className="ml-auto"
            aria-label="Add slides"
          >
            <PlusIcon className="size-4" />
          </Button>
          <input
            ref={fileInputRef}
            type="file"
            accept={ACCEPT_ATTR}
            multiple
            onChange={(e) => {
              void handleFiles(Array.from(e.target.files ?? []))
              e.target.value = ""
            }}
            className="sr-only"
          />
        </div>
      </PanelHeader>

      <div className="flex flex-1 min-h-0 overflow-hidden">
        <div className="flex flex-1 flex-col min-w-0">
          <ScrollArea className="flex-1 min-h-0">
              <div className="p-2 space-y-1">
                {slides.length === 0 ? (
                  <div className="flex flex-col items-center justify-center h-full text-muted-foreground text-sm px-4 py-8">
                    <ImagesIcon className="size-12 mb-2 opacity-50" />
                    <p className="text-center">No slides yet</p>
                    <p className="text-xs opacity-60">
                      Add images, videos, or PDFs for announcements and
                      presentations
                    </p>
                    <Button
                      variant="outline"
                      size="sm"
                      className="mt-4"
                      onClick={() => fileInputRef.current?.click()}
                    >
                      <PlusIcon className="size-3.5" />
                      <span>Add files</span>
                    </Button>
                  </div>
                ) : (
                  slides.map((slide, i) => {
                    const presented = isPresented(slide.id)
                    return (
                      <div
                        key={slide.id}
                        className={cn(
                          "flex items-center gap-2 p-2 rounded-lg transition-colors",
                          presented
                            ? "bg-primary/10 border border-primary/20"
                            : "hover:bg-accent hover:text-accent-foreground"
                        )}
                      >
                        <button
                          onClick={() => present(i)}
                          className="relative shrink-0 w-20 aspect-video rounded-md border border-border bg-muted overflow-hidden"
                          aria-label={`Present ${slide.name}`}
                        >
                          {resolveSlideKind(slide) === "video" ? (
                            <video
                              src={slide.dataUrl}
                              className="w-full h-full object-cover"
                              muted
                              preload="metadata"
                            />
                          ) : resolveSlideKind(slide) === "pdf" ? (
                            <span className="flex h-full w-full items-center justify-center bg-muted">
                              <FileTextIcon className="size-6 text-muted-foreground" />
                            </span>
                          ) : (
                            <img
                              src={slide.dataUrl}
                              alt={slide.name}
                              className="w-full h-full object-cover"
                            />
                          )}
                          <span className="absolute bottom-0.5 left-1 text-[10px] font-mono text-white bg-black/60 rounded px-1">
                            {i + 1}
                          </span>
                        </button>
                        <button
                          onClick={() => present(i)}
                          className="flex-1 min-w-0 text-left"
                        >
                          <p className="text-sm font-medium truncate">
                            {slide.name || `Slide ${i + 1}`}
                          </p>
                          <p className="text-xs text-muted-foreground">
                            {presented ? "On screen" : "Click to present"}
                          </p>
                        </button>
                        <div className="flex flex-col shrink-0">
                          <Button
                            variant="ghost"
                            size="icon-sm"
                            className="h-6 w-6"
                            onClick={() =>
                              useSlidesStore.getState().moveSlide(slide.id, -1)
                            }
                            disabled={i === 0}
                            aria-label="Move slide up"
                          >
                            <ChevronUpIcon className="size-3.5" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon-sm"
                            className="h-6 w-6"
                            onClick={() =>
                              useSlidesStore.getState().moveSlide(slide.id, 1)
                            }
                            disabled={i === slides.length - 1}
                            aria-label="Move slide down"
                          >
                            <ChevronDownIcon className="size-3.5" />
                          </Button>
                        </div>
                        <Button
                          variant="ghost"
                          size="icon-sm"
                          className="h-6 w-6 shrink-0 text-destructive hover:text-destructive"
                          onClick={() =>
                            useSlidesStore.getState().removeSlide(slide.id)
                          }
                          aria-label="Delete slide"
                        >
                          <Trash2Icon className="size-3.5" />
                        </Button>
                      </div>
                    )
                  })
                )}
              </div>
            </ScrollArea>
            {slides.length > 0 && (
              <>
                <Separator />
                <div className="flex items-center gap-1.5 border-t border-border px-3 py-2 text-[11px] text-muted-foreground">
                  <ImagesIcon className="size-3.5" />
                  <span>
                    {slides.length} slide{slides.length === 1 ? "" : "s"} — click
                    a slide to present it live
                  </span>
                </div>
              </>
            )}
        </div>
      </div>
    </div>
  )
}
