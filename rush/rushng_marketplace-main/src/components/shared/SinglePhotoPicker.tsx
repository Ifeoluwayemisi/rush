"use client";

import { useRef, useState } from "react";
import { Loader2, Camera } from "lucide-react";
import { useRush } from "@/lib/store";
import { useUploadFile } from "@/lib/hooks";

/**
 * SinglePhotoPicker — single-image uploader with a circular (avatar)
 * or rectangular (cover/logo) preview.
 *
 * Like PhotoUploader but for one image at a time. Used for:
 *   - User avatars (circular)
 *   - Vendor logos (square)
 *   - Vendor cover images (wide rectangle)
 *
 * Controlled input: parent owns the URL string and passes it via
 * `value` (string | null) + `onChange: (url: string) => void`.
 *
 * Click the preview (or empty slot) to open the file picker.
 * Click the "Remove" text link to clear.
 */
interface SinglePhotoPickerProps {
  /** Current image URL, or null/empty for "no image". */
  value?: string | null;
  /** Called with the new URL when an upload completes, or "" when cleared. */
  onChange: (url: string) => void;
  /** Visual shape: "circle" for avatars, "rect" for cover/logo. */
  shape?: "circle" | "rect";
  /** Aspect ratio hint for the rect shape. Default 16/9 for covers. */
  aspect?: "16/9" | "1/1" | "4/3";
  /** Size in px for circle shape. Default 96. */
  size?: number;
  /** Label below the picker. */
  label?: string;
  /** Placeholder text when empty. */
  placeholder?: string;
}

const MAX_FILE_BYTES = 5 * 1024 * 1024;

export function SinglePhotoPicker({
  value,
  onChange,
  shape = "rect",
  aspect = "16/9",
  size = 96,
  label,
  placeholder = "Tap to upload",
}: SinglePhotoPickerProps) {
  const { pushToast } = useRush();
  const uploadMut = useUploadFile();
  const fileRef = useRef<HTMLInputElement>(null);
  const [uploading, setUploading] = useState(false);

  const hasImage = !!value;

  async function handleFilePicked(files: FileList | null) {
    if (!files || files.length === 0) return;
    const file = files[0]!;

    if (!file.type.startsWith("image/")) {
      pushToast({ title: "Not an image", description: file.name });
      return;
    }
    if (file.size > MAX_FILE_BYTES) {
      pushToast({
        title: "File too large",
        description: `${file.name} is ${(file.size / 1024 / 1024).toFixed(1)} MB. Max 5 MB.`,
      });
      return;
    }

    setUploading(true);
    try {
      const res = await uploadMut.mutateAsync(file);
      onChange(res.url);
      pushToast({ title: "Photo uploaded" });
    } catch (err: any) {
      pushToast({ title: "Upload failed", description: err.message });
    } finally {
      setUploading(false);
      if (fileRef.current) fileRef.current.value = "";
    }
  }

  const aspectClass =
    aspect === "1/1" ? "aspect-square" :
    aspect === "4/3" ? "aspect-[4/3]" :
    "aspect-[16/9]";

  return (
    <div>
      {label && (
        <span className="block text-xs font-semibold text-ink-soft mb-1.5">{label}</span>
      )}
      <div className="flex items-start gap-3">
        <button
          type="button"
          onClick={() => fileRef.current?.click()}
          disabled={uploading}
          className={`relative shrink-0 overflow-hidden border-2 border-dashed border-border hover:border-rush transition-colors flex items-center justify-center text-ink-soft hover:text-rush bg-muted/40 disabled:opacity-50 ${
            shape === "circle" ? "rounded-full" : "rounded-xl"
          } ${shape === "circle" ? "" : aspectClass}`}
          style={shape === "circle" ? { width: size, height: size } : undefined}
          aria-label={hasImage ? "Change photo" : "Upload photo"}
        >
          {hasImage ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={value!}
              alt="Uploaded"
              className="w-full h-full object-cover"
            />
          ) : uploading ? (
            <Loader2 className="h-5 w-5 animate-spin" />
          ) : (
            <div className="flex flex-col items-center gap-1 p-3">
              <Camera className="h-5 w-5" />
              <span className="text-[10px] font-semibold text-center leading-tight">{placeholder}</span>
            </div>
          )}

          {hasImage && !uploading && (
            <div className="absolute inset-0 bg-ink/0 hover:bg-ink/40 transition-colors flex items-center justify-center opacity-0 hover:opacity-100">
              <Camera className="h-5 w-5 text-white" />
            </div>
          )}
        </button>

        {hasImage && !uploading && (
          <button
            type="button"
            onClick={() => onChange("")}
            className="mt-1 text-xs text-ink-soft hover:text-destructive underline-offset-2 hover:underline"
          >
            Remove
          </button>
        )}
      </div>

      <input
        ref={fileRef}
        type="file"
        accept="image/*"
        className="hidden"
        onChange={(e) => {
          void handleFilePicked(e.target.files);
        }}
      />

      {!hasImage && (
        <p className="mt-1.5 text-[10px] text-ink-soft/80">
          5 MB max · JPG/PNG/WebP
        </p>
      )}
    </div>
  );
}
