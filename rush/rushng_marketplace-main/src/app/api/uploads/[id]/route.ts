import { NextRequest, NextResponse } from "next/server";
import { connect } from "@/lib/db";
import { GridFSBucket, ObjectId } from "mongodb";

/**
 * GET /api/uploads/:id
 *
 * Streams an uploaded image from MongoDB GridFS back to the browser.
 * The URL pattern is what POST /api/uploads returns in its `url` field
 * (`/api/uploads/<objectId>`), so all `<img src="/api/uploads/...">`
 * tags hit this route.
 *
 * Headers:
 *   - Content-Type: image/webp (we always re-encode on upload)
 *   - Cache-Control: public, max-age=31536000, immutable (the SHA-style
 *     random id never changes, so the browser can cache forever)
 *   - X-Content-Type-Options: nosniff (don't let the browser MIME-sniff
 *     this as a script even if a polyglot slipped through)
 *   - Content-Security-Policy: default-src 'self'; script-src 'none'
 *     (defense in depth — even a polyglot can't execute as JS)
 *
 * Not found → 404. Bad id format → 400 (let the browser cache the 404
 * for a short time too so we don't get hammered on bad URLs).
 */
export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;

  // Validate the id is a 24-char hex ObjectId. Anything else is
  // either malformed or a probing attack — short-circuit with 400.
  if (!id || !/^[a-f0-9]{24}$/.test(id)) {
    return new NextResponse("Not found", {
      status: 404,
      headers: { "Cache-Control": "private, max-age=60" },
    });
  }

  let objectId: ObjectId;
  try {
    objectId = new ObjectId(id);
  } catch {
    return new NextResponse("Not found", {
      status: 404,
      headers: { "Cache-Control": "private, max-age=60" },
    });
  }

  try {
    const { db } = await connect();
    const bucket = new GridFSBucket(db, { bucketName: "uploads" });

    // Look up the file metadata first. If it doesn't exist, 404
    // without opening a download stream (avoids GridFS error logs).
    const files = await bucket.find({ _id: objectId }).limit(1).toArray();
    if (files.length === 0) {
      return new NextResponse("Not found", {
        status: 404,
        headers: { "Cache-Control": "private, max-age=60" },
      });
    }

    const file = files[0]!;
    const stream = bucket.openDownloadStream(objectId);

    // Read the stream into a buffer. We could pipe directly to the
    // Response body for true streaming, but Next.js route handlers
    // in production want a ReadableStream — and bundling it cleanly
    // requires a few extra guards. Buffering is simpler and fine
    // for our use case (max image size ~5MB after WebP encode).
    const chunks: Buffer[] = [];
    for await (const chunk of stream) {
      chunks.push(chunk as Buffer);
    }
    const buffer = Buffer.concat(chunks);

    // mongodb v7 dropped the top-level `contentType` field from
    // GridFSFile; we store it inside `metadata` on upload. Fall back
    // to image/webp if the metadata is missing (e.g. file written
    // by an older version of the uploader — there isn't one yet,
    // but defensive coding is cheap).
    const contentType =
      (file.metadata as { contentType?: string } | undefined)?.contentType ||
      "image/webp";

    // Build the response with strict caching + security headers.
    const headers = new Headers({
      "Content-Type": contentType,
      "Content-Length": String(buffer.length),
      "Cache-Control": "public, max-age=31536000, immutable",
      "X-Content-Type-Options": "nosniff",
      "Content-Security-Policy": "default-src 'self'; script-src 'none'",
      "Access-Control-Allow-Origin": "'self'",
    });

    return new NextResponse(buffer, { status: 200, headers });
  } catch (err: any) {
    console.error("[uploads GET] error", err?.message ?? err);
    return new NextResponse("Failed to read file", {
      status: 500,
    });
  }
}
