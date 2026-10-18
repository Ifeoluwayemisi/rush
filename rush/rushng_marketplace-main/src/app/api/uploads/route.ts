import { NextRequest, NextResponse } from "next/server";
import { requireUser } from "@/lib/auth";
import { enforceRateLimit } from "@/lib/rate-limit";
import { randomBytes } from "node:crypto";
import sharp from "sharp";
import { connect } from "@/lib/db";
import { GridFSBucket } from "mongodb";

/**
 * POST /api/uploads
 *
 * Multipart form-data: `file` field with an image.
 * Auth required.
 *
 * Stores the image in MongoDB GridFS (re-encoded to WebP at 1200px,
 * quality 82). Returns `{ url, size, contentType }` where `url` is a
 * `/api/uploads/<id>` path that streams the file back via the GET
 * handler in `[id]/route.ts`.
 *
 * WHY GRIDFS (vs. the filesystem):
 *   The previous implementation wrote to `public/uploads/<file>.webp`.
 *   That works in local dev but breaks on Vercel: serverless functions
 *   can't write to the bundled `public/` directory at runtime — the
 *   `mkdir`/`writeFile` calls throw EROFS (read-only filesystem).
 *
 *   GridFS stores the file's bytes inside MongoDB itself, which is
 *   already a configured, writable store for the app. It works
 *   identically in local dev and on Vercel — no extra infra.
 *
 *   The trade-off: images aren't cached on a CDN automatically. We
 *   set immutable Cache-Control headers on the GET handler so the
 *   browser caches them hard after the first fetch; for higher scale
 *   you'd want to put CloudFront/Fastly in front.
 *
 * Security:
 *   - Magic-byte sniff — sharp decodes the input; if it's not a real
 *     image, sharp throws and we return 400. We never trust the
 *     declared Content-Type.
 *   - Max 5MB raw upload.
 *   - Output is re-encoded to WebP — strips any embedded payload
 *     (EXIF, comments, etc.) before storage.
 *   - The GET handler sets CSP `script-src 'none'` on /api/uploads/*
 *     so even a polyglot upload can't execute as a script in the browser.
 */
export async function POST(req: NextRequest) {
  // Rate limit: 30 uploads per minute per IP.
  const blocked = enforceRateLimit(req, "upload", { limit: 30, windowMs: 60_000 });
  if (blocked) return blocked;

  try {
    const user = await requireUser();

    const formData = await req.formData();
    const file = formData.get("file");
    if (!(file instanceof File)) {
      return NextResponse.json({ error: "No file uploaded" }, { status: 400 });
    }

    // 5 MB max (raw bytes — before WebP re-encode).
    if (file.size > 5 * 1024 * 1024) {
      return NextResponse.json({ error: "File too large. Max 5MB." }, { status: 413 });
    }

    const bytes = Buffer.from(await file.arrayBuffer());

    // Re-encode to WebP, max 1200px wide, quality 82. sharp will
    // throw if the input isn't a real image — that's our magic-byte
    // check. We catch it and return a clean 400.
    let webp: Buffer;
    try {
      webp = await sharp(bytes)
        .resize({ width: 1200, height: 1200, fit: "inside", withoutEnlargement: true })
        .webp({ quality: 82 })
        .toBuffer();
    } catch (err: any) {
      console.error("[uploads] sharp rejected:", err?.message ?? err);
      return NextResponse.json(
        { error: "File is not a valid image" },
        { status: 400 },
      );
    }

    // Random filename — never trust the user-supplied name. Random
    // 16 bytes → 32 hex chars + extension. Stored as the GridFS
    // filename for debugging (the public URL uses the _id instead).
    const randomId = randomBytes(16).toString("hex");
    const filename = `${randomId}.webp`;

    // Store the re-encoded WebP bytes in GridFS.
    const { db } = await connect();
    const bucket = new GridFSBucket(db, { bucketName: "uploads" });

    // openUploadStream returns a Node Writable + emits a 'finish'
    // event when the bytes are persisted. In mongodb v7, the
    // GridFSBucketWriteStreamOptions type no longer accepts
    // `contentType` directly — we store it inside `metadata` and
    // the GET handler reads it back from there.
    const storedId: string = await new Promise((resolve, reject) => {
      const uploadStream = bucket.openUploadStream(filename, {
        metadata: {
          contentType: "image/webp",
          uploaderUserId: user.id,
          uploaderEmail: user.email,
          originalName: file.name,
          originalSize: file.size,
          originalType: file.type,
          storedAt: new Date().toISOString(),
        },
      });
      uploadStream.on("error", reject);
      uploadStream.on("finish", () => {
        // id is an ObjectId; cast to string for the URL.
        resolve(String(uploadStream.id));
      });
      uploadStream.end(webp);
    });

    // Public URL is `/api/uploads/<id>` — GET handler streams the bytes.
    const url = `/api/uploads/${storedId}`;

    console.log(
      `[uploads] user=${user.id} saved ${url} ` +
        `(${file.size}B raw → ${webp.length}B webp)`,
    );

    return NextResponse.json({
      url,
      size: webp.length,
      contentType: "image/webp",
    });
  } catch (err: any) {
    if (err instanceof Response) return err;
    console.error("[uploads POST] error", err);
    return NextResponse.json(
      { error: err.message || "Failed to upload" },
      { status: 500 },
    );
  }
}
