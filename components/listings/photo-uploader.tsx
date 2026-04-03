'use client'

import { useCallback, useEffect, useRef, useState } from 'react'
import Image from 'next/image'
import { Upload, X, ImageIcon } from 'lucide-react'
import { cn } from '@/lib/utils'

const ALLOWED_TYPES = ['image/jpeg', 'image/png', 'image/webp']
const MAX_FILES = 10
const MAX_SIZE_MB = 5

interface PhotoUploaderProps {
  files: File[]
  onChange: (files: File[]) => void
}

interface Preview {
  file: File
  url: string
}

export function PhotoUploader({ files, onChange }: PhotoUploaderProps) {
  const [previews, setPreviews] = useState<Preview[]>([])
  const [isDragging, setIsDragging] = useState(false)
  const inputRef = useRef<HTMLInputElement>(null)

  // Sync preview list when files prop changes
  useEffect(() => {
    // Revoke URLs for files no longer in the list
    setPreviews((prev) => {
      const prevFiles = prev.map((p) => p.file)
      const removed = prev.filter((p) => !files.includes(p.file))
      removed.forEach((p) => URL.revokeObjectURL(p.url))

      const added = files.filter((f) => !prevFiles.includes(f))
      const newPreviews = added.map((file) => ({
        file,
        url: URL.createObjectURL(file),
      }))

      return [
        ...prev.filter((p) => files.includes(p.file)),
        ...newPreviews,
      ]
    })
  }, [files])

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      setPreviews((prev) => {
        prev.forEach((p) => URL.revokeObjectURL(p.url))
        return []
      })
    }
  }, [])

  const addFiles = useCallback(
    (incoming: File[]) => {
      const valid = incoming.filter((f) => {
        if (!ALLOWED_TYPES.includes(f.type)) return false
        if (f.size > MAX_SIZE_MB * 1024 * 1024) return false
        return true
      })

      const remaining = MAX_FILES - files.length
      onChange([...files, ...valid.slice(0, remaining)])
    },
    [files, onChange]
  )

  const removeFile = useCallback(
    (file: File) => {
      onChange(files.filter((f) => f !== file))
    },
    [files, onChange]
  )

  const handleDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault()
      setIsDragging(false)
      addFiles(Array.from(e.dataTransfer.files))
    },
    [addFiles]
  )

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault()
    setIsDragging(true)
  }

  const handleDragLeave = (e: React.DragEvent) => {
    if (!e.currentTarget.contains(e.relatedTarget as Node)) {
      setIsDragging(false)
    }
  }

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files) {
      addFiles(Array.from(e.target.files))
      e.target.value = ''
    }
  }

  const canAddMore = files.length < MAX_FILES

  return (
    <div className="space-y-4">
      {/* Drop zone */}
      <div
        onDrop={handleDrop}
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        className={cn(
          'relative flex flex-col items-center justify-center rounded-lg border-2 border-dashed p-8 text-center transition-colors',
          isDragging
            ? 'border-primary bg-primary/5'
            : 'border-muted-foreground/25 hover:border-muted-foreground/50',
          !canAddMore && 'pointer-events-none opacity-50'
        )}
      >
        <Upload className="mb-3 h-8 w-8 text-muted-foreground" />
        <p className="text-sm font-medium">
          {canAddMore ? (
            <>
              Drag & drop photos here, or{' '}
              <button
                type="button"
                onClick={() => inputRef.current?.click()}
                className="text-primary underline-offset-2 hover:underline"
              >
                browse
              </button>
            </>
          ) : (
            'Maximum 10 photos reached'
          )}
        </p>
        <p className="mt-1 text-xs text-muted-foreground">
          JPEG, PNG or WebP · Max {MAX_SIZE_MB} MB each · Up to {MAX_FILES} photos
        </p>
        {files.length > 0 && (
          <p className="mt-2 text-xs text-muted-foreground">
            {files.length} / {MAX_FILES} selected
          </p>
        )}
        <input
          ref={inputRef}
          type="file"
          accept="image/jpeg,image/png,image/webp"
          multiple
          className="sr-only"
          onChange={handleInputChange}
          aria-label="Upload photos"
        />
      </div>

      {/* Preview grid */}
      {previews.length > 0 && (
        <ul className="grid grid-cols-3 gap-3 sm:grid-cols-4 md:grid-cols-5">
          {previews.map(({ file, url }, index) => (
            <li key={url} className="relative aspect-square group">
              <div className="relative h-full w-full overflow-hidden rounded-md border bg-muted">
                <Image
                  src={url}
                  alt={`Photo ${index + 1}`}
                  fill
                  sizes="(max-width: 640px) 33vw, (max-width: 768px) 25vw, 20vw"
                  className="object-cover"
                />
                {index === 0 && (
                  <span className="absolute bottom-1 left-1 rounded bg-black/60 px-1 py-0.5 text-[10px] font-medium text-white">
                    Cover
                  </span>
                )}
              </div>
              <button
                type="button"
                onClick={() => removeFile(file)}
                className={cn(
                  'absolute -right-1.5 -top-1.5 flex h-5 w-5 items-center justify-center rounded-full',
                  'bg-destructive text-white shadow-sm',
                  'opacity-0 transition-opacity group-hover:opacity-100 focus:opacity-100',
                )}
                aria-label={`Remove photo ${index + 1}`}
              >
                <X className="h-3 w-3" />
              </button>
            </li>
          ))}
          {/* Empty slot hint */}
          {canAddMore && (
            <li
              className="flex aspect-square cursor-pointer items-center justify-center rounded-md border-2 border-dashed border-muted-foreground/25 hover:border-muted-foreground/50 transition-colors"
              onClick={() => inputRef.current?.click()}
            >
              <ImageIcon className="h-6 w-6 text-muted-foreground/50" />
            </li>
          )}
        </ul>
      )}
    </div>
  )
}
