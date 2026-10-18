"use client";

import { useRef, useState } from "react";
import { Loader2, X, Camera, AlertCircle } from "lucide-react";
import { useRush } from "@/lib/store";
import { useUploadFile } from "@/lib/hooks";

/**
 * PhotoUploader — multi-file image uploader with previews.
 *
 * Replaces the old "paste image URLs line by line" textarea. Uses
 * POST /api/uploads (built in Sprint 2) which:
 *   - magic-byte sniffs via sharp (rejects non-images)
 *   - re-encodes to WebP 1200px @q82 (small, consistent format)
 *   - stores under /public/uploads/<random>.webp
 *   - returns { url, size, contentType }
 *
 * The component receives the current `value` (array of URL strings)
 * and `onChange` callback. The parent treats it like any other
 * controlled input — the URLs land in the form's `images` array
 * which the POST /api/products endpoint accepts as-is.
 *
 * Limits (server-enforced where relevant):
 *   - Max 5 MB per file (server returns 413; we also check client-side
 *     for a friendlier error message before uploading)
 *   - Max 6 images per product (configurable via `maxImages` prop)
 *   - Images only (server-side magic-byte check; client-side `accept`
 *     attribute steers the file picker)
 */
interface PhotoUploaderProps {
  /** Current list of image URLs (controlled input). */
  value: string[];
  /** Called whenever the list changes (add or remove). */
  onChange: (urls: string[]) => void;
  /** Max number of images. Defaults to 6. */
  maxImages?: number;
  /** Optional label override. Defaults to "Photos". */
  label?: string;
}

const MAX_FILE_BYTES = 5 * 1024 * 1024; // 5 MB matches server-side check

export function PhotoUploader({
  value,
  onChange,
  maxImages = 6,
  label = "Photos",
}: PhotoUploaderProps) {
  const { pushToast } = useRush();
  const uploadMut = useUploadFile();
  const fileRef = useRef<HTMLInputElement>(null);

  // Track which slots are currently uploading — render a spinner
  // over the slot's expected position.
  const [uploadingCount, setUploadingCount] = useState(0);

  async function handleFilesPicked(files: FileList | null) {
    if (!files || files.length === 0) return;

    const remaining = maxImages - value.length;
    if (remaining <= 0) {
      pushToast({
        title: `Max ${maxImages} photos`,
        description: "Remove one before adding more.",
      });
      return;
    }

    // Convert to array, validate, take only as many as we have room for.
    const picked = Array.from(files).slice(0, remaining);

    // Client-side validation: reject non-images and oversize files
    // BEFORE uploading (saves a network round-trip + gives a clearer
    // error than the server's 413).
    const valid: File[] = [];
    for (const f of picked) {
      if (!f.type.startsWith("image/")) {
        pushToast({ title: "Not an image", description: f.name });
        continue;
      }
      if (f.size > MAX_FILE_BYTES) {
        pushToast({
          title: "File too large",
          description: `${f.name} is ${(f.size / 1024 / 1024).toFixed(1)} MB. Max 5 MB.`,
        });
        continue;
      }
      valid.push(f);
    }

    if (valid.length === 0) return;

    setUploadingCount((c) => c + valid.length);
    try {
      // Upload in parallel — they're independent.
      const results = await Promise.allSettled(
        valid.map((f) => uploadMut.mutateAsync(f)),
      );
      const newUrls: string[] = [];
      let failures = 0;
      for (const r of results) {
        if (r.status === "fulfilled") {
          newUrls.push(r.value.url);
        } else {
          failures++;
        }
      }
      if (newUrls.length > 0) {
        onChange([...value, ...newUrls]);
      }
      if (failures > 0) {
        pushToast({
          title: `${failures} upload${failures > 1 ? "s" : ""} failed`,
          description: newUrls.length > 0
            ? `${newUrls.length} succeeded.`
            : "Try again — server rejected the file(s).",
        });
      } else {
        pushToast({
          title: `${newUrls.length} photo${newUrls.length > 1 ? "s" : ""} added`,
        });
      }
    } finally {
      setUploadingCount((c) => Math.max(0, c - valid.length));
      // Reset the file input so picking the same file again triggers
      // a change event (otherwise the browser thinks it's the same
      // selection and doesn't fire).
      if (fileRef.current) fileRef.current.value = "";
    }
  }

  function handleRemove(url: string) {
    onChange(value.filter((u) => u !== url));
  }

  // Build the visible tile grid: existing images + uploading placeholders + "add" tile.
  const slotsTaken = value.length + uploadingCount;
  const canAddMore = slotsTaken < maxImages;

  return (
    <div>
      <span className="block text-xs font-semibold text-ink-soft mb-1.5">{label}</span>
      <div className="grid grid-cols-4 gap-2">
        {/* Existing uploaded images */}
        {value.map((url) => (
          <Thumb key={url} url={url} onRemove={() => handleRemove(url)} />
        ))}

        {/* Placeholder tiles for in-flight uploads (so the grid doesn't
            jump when uploads land). One tile per active upload. */}
        {Array.from({ length: uploadingCount }).map((_, i) => (
          <div
            key={`uploading-${i}`}
            className="relative aspect-square rounded-xl bg-muted border border-dashed border-border flex items-center justify-center"
          >
            <Loader2 className="h-5 w-5 animate-spin text-rush" />
          </div>
        ))}

        {/* Add-more tile (hidden when at max). */}
        {canAddMore && (
          <button
            type="button"
            onClick={() => fileRef.current?.click()}
            className="aspect-square rounded-xl border-2 border-dashed border-border hover:border-rush hover:bg-rush-soft/40 transition-colors flex flex-col items-center justify-center gap-1 text-ink-soft hover:text-rush"
            aria-label="Add photos"
          >
            <Camera className="h-5 w-5" />
            <span className="text-[10px] font-semibold">Add</span>
          </button>
        )}
      </div>

      {/* Hidden file input — multi-select, images only.
          We do NOT set `capture="environment"` here. That attribute
          forces the OS file picker straight to the rear camera on
          mobile, with no way to pick from the gallery. Letting the
          picker show both options is the right default — most product
          photos are shot ahead of time, not live. */}
      <input
        ref={fileRef}
        type="file"
        accept="image/*"
        multiple
        className="hidden"
        onChange={(e) => {
          void handleFilesPicked(e.target.files);
        }}
      />

      {/* Hint + state */}
      <div className="mt-1.5 flex items-center gap-1 text-[10px] text-ink-soft/80">
        <AlertCircle className="h-3 w-3 shrink-0" />
        <span>
          {value.length === 0
            ? `Up to ${maxImages} photos · 5 MB each · JPG/PNG/WebP`
            : `${value.length} of ${maxImages} — first photo becomes the product's main image`}
        </span>
      </div>
    </div>
  );
}

/**
 * Single image thumbnail with remove (×) button.
 * Pure presentational — state lives in the parent.
 */
function Thumb({ url, onRemove }: { url: string; onRemove: () => void }) {
  // Use next/image? No — these are user-uploaded runtime images, the
  // next/image optimizer would need a remote pattern configured.
  // <img loading="lazy"> is fine and avoids the import.
  return (
    <div className="relative aspect-square rounded-xl overflow-hidden border border-border bg-muted group">
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src={url}
        alt="Product photo"
        loading="lazy"
        className="w-full h-full object-cover"
      />
      <button
        type="button"
        onClick={onRemove}
        className="absolute top-1 right-1 h-5 w-5 rounded-full bg-background/90 backdrop-blur-sm shadow-sm flex items-center justify-center text-ink-soft hover:text-destructive hover:bg-background"
        aria-label="Remove photo"
      >
        <X className="h-3 w-3" />
      </button>
    </div>
  );
}
