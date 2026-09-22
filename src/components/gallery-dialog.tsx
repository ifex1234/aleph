"use client"

import * as React from "react"
import { useGalleryStore } from "@/stores"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import {
  FileTextIcon as GalleryIcon,
  Trash2Icon,
  UploadIcon,
  XIcon,
  CheckIcon,
} from "lucide-react"
import { cn } from "@/lib/utils"

export function GalleryDialog() {
  const { images, isOpen, setOpen, addImage, removeImage } = useGalleryStore()
  const [previewImage, setPreviewImage] = React.useState<string | null>(null)
  const [uploadName, setUploadName] = React.useState("")
  const [selectedFiles, setSelectedFiles] = React.useState<File[]>([])

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files ?? [])
    if (files.length === 0) return

    // Validate file types
    const validFiles = files.filter((f) =>
      ["image/png", "image/jpeg", "image/webp", "image/gif", "image/bmp", "image/svg+xml"].includes(
        f.type
      )
    )

    if (validFiles.length !== files.length) {
      alert("Some files were skipped. Only PNG, JPEG, WebP, GIF, BMP, and SVG images are supported.")
    }

    setSelectedFiles(validFiles)
    if (validFiles.length === 1) {
      setUploadName(validFiles[0].name.replace(/\.[^/.]+$/, ""))
    }
  }

  const handleUpload = async () => {
    for (const file of selectedFiles) {
      const name = uploadName || file.name.replace(/\.[^/.]+$/, "")
      const dataUrl = await fileToDataUrl(file)
      addImage({
        name,
        dataUrl,
        mimeType: file.type,
        size: file.size,
      })
    }
    setSelectedFiles([])
    setUploadName("")
    setOpen(false)
  }

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault()
    e.stopPropagation()
  }

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault()
    e.stopPropagation()
    const files = Array.from(e.dataTransfer.files)
    if (files.length > 0) {
      const validFiles = files.filter((f) =>
        ["image/png", "image/jpeg", "image/webp", "image/gif", "image/bmp", "image/svg+xml"].includes(
          f.type
        )
      )
      setSelectedFiles(validFiles)
      if (validFiles.length === 1) {
        setUploadName(validFiles[0].name.replace(/\.[^/.]+$/, ""))
      }
    }
  }

  const formatFileSize = (bytes: number) => {
    if (bytes < 1024) return `${bytes} B`
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`
  }

  return (
    <>
      <Dialog open={isOpen} onOpenChange={setOpen}>
        <DialogContent className="max-w-3xl max-h-[80vh] p-0 overflow-hidden">
          <DialogHeader className="p-4 border-b">
            <DialogTitle className="flex items-center justify-between">
              <span className="flex items-center gap-2">
                <GalleryIcon className="h-5 w-5" />
                Gallery
              </span>
              <span className="text-xs text-muted-foreground">{images.length} image(s)</span>
            </DialogTitle>
          </DialogHeader>

          <div
            className={cn(
              "p-4 border-b flex items-center gap-3",
              selectedFiles.length > 0 && "bg-muted/50"
            )}
            onDragOver={handleDragOver}
            onDrop={handleDrop}
          >
            {selectedFiles.length === 0 ? (
              <div className="flex items-center gap-3 w-full">
                <label className="flex items-center gap-2 cursor-pointer">
                  <UploadIcon className="h-4 w-4 text-muted-foreground" />
                  <span className="text-sm text-muted-foreground">Drag & drop or click to upload</span>
                  <input
                    type="file"
                    accept="image/png,image/jpeg,image/webp,image/gif,image/bmp,image/svg+xml"
                    multiple
                    onChange={handleFileSelect}
                    className="sr-only"
                  />
                </label>
                <span className="text-xs text-muted-foreground">PNG, JPG, WebP, GIF, BMP, SVG</span>
              </div>
            ) : (
              <div className="flex items-center gap-3 w-full">
                <div className="flex items-center gap-2 flex-1 min-w-0">
                  <GalleryIcon className="h-4 w-4 text-primary" />
                  <Input
                    value={uploadName}
                    onChange={(e) => setUploadName(e.target.value)}
                    placeholder="Image name"
                    className="flex-1"
                    onKeyDown={(e) => e.key === "Enter" && handleUpload()}
                  />
                </div>
                <Button size="sm" variant="outline" onClick={() => setSelectedFiles([])}>
                  <XIcon className="h-4 w-4" />
                  <span>Cancel</span>
                </Button>
                <Button size="sm" onClick={handleUpload} disabled={selectedFiles.length === 0}>
                  <CheckIcon className="h-4 w-4" />
                  <span>Upload {selectedFiles.length}</span>
                </Button>
              </div>
            )}
          </div>

          <div className="p-4 max-h-[50vh] overflow-y-auto">
            {images.length === 0 && selectedFiles.length === 0 ? (
              <div className="flex flex-col items-center justify-center h-48 text-muted-foreground">
                <GalleryIcon className="h-12 w-12 opacity-50" />
                <p className="mt-2 text-sm">No images yet</p>
                <p className="text-xs">Upload images to use as backgrounds</p>
              </div>
            ) : (
              <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-3">
                {selectedFiles.map((file, index) => (
                  <div
                    key={`pending-${index}`}
                    className="relative aspect-square rounded-lg border-2 border-primary bg-muted overflow-hidden"
                  >
                    <img
                      src={URL.createObjectURL(file)}
                      alt={file.name}
                      className="w-full h-full object-cover"
                    />
                    <div className="absolute inset-0 bg-black/50 flex items-center justify-center">
                      <span className="text-white text-xs px-2 py-1 bg-primary rounded">
                        Pending
                      </span>
                    </div>
                  </div>
                ))}
                {images.map((image) => (
                  <div
                    key={image.id}
                    className="relative aspect-square rounded-lg border border-border bg-muted overflow-hidden group"
                  >
                    <img
                      src={image.dataUrl}
                      alt={image.name}
                      className="w-full h-full object-cover transition-transform group-hover:scale-105"
                      onClick={() => setPreviewImage(image.dataUrl)}
                    />
                    <div className="absolute bottom-0 left-0 right-0 p-2 bg-gradient-to-t from-black/70 to-transparent">
                      <p className="text-white text-xs truncate">{image.name}</p>
                      <p className="text-white/70 text-[0.5rem] truncate">
                        {formatFileSize(image.size)} • {new Date(image.createdAt).toLocaleDateString()}
                      </p>
                    </div>
                    <button
                      onClick={(e) => {
                        e.stopPropagation()
                        removeImage(image.id)
                      }}
                      className="absolute top-1 right-1 p-1 bg-black/50 text-white rounded-full opacity-0 group-hover:opacity-100 transition-opacity hover:bg-red-500"
                      aria-label="Delete image"
                    >
                      <Trash2Icon className="h-3 w-3" />
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>
        </DialogContent>
      </Dialog>

      {/* Preview Modal */}
      {previewImage && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/90"
          onClick={() => setPreviewImage(null)}
        >
          <img
            src={previewImage}
            alt="Preview"
            className="max-w-[90vw] max-h-[90vh] object-contain"
            onClick={(e) => e.stopPropagation()}
          />
          <button
            className="absolute top-4 right-4 p-2 bg-white/10 text-white rounded-full hover:bg-white/20"
            onClick={() => setPreviewImage(null)}
            aria-label="Close preview"
          >
            <XIcon className="h-6 w-6" />
          </button>
        </div>
      )}
    </>
  )
}

function fileToDataUrl(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.onload = () => resolve(reader.result as string)
    reader.onerror = reject
    reader.readAsDataURL(file)
  })
}