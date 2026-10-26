import { createReadStream } from "node:fs";
import { realpath, stat } from "node:fs/promises";
import path from "node:path";
import { Readable } from "node:stream";
import { MEDIA_TYPES, resolveMediaPath, uploadRoot } from "@/lib/media/storage";

/**
 * Serves uploaded media in development and simple deployments. In production Nginx serves
 * UPLOAD_DIR directly (docs/deploy-notes.md); the headers here mirror that configuration.
 */
export async function GET(_request: Request, context: RouteContext<"/media/[...path]">) {
  const { path: segments } = await context.params;
  const file = resolveMediaPath(segments);
  const type = file ? MEDIA_TYPES[path.extname(file).toLowerCase()] : undefined;
  if (!file || !type) return notFound();

  try {
    // Defeat symlink escapes: the real path must still live inside the real upload root.
    const [real, root] = await Promise.all([realpath(file), realpath(uploadRoot())]);
    if (!real.startsWith(root + path.sep)) return notFound();
    const info = await stat(real);
    if (!info.isFile()) return notFound();

    const headers = new Headers({
      "Content-Type": type,
      "Content-Length": String(info.size),
      // File names are content-addressed by their asset directory, so they never change.
      "Cache-Control": "public, max-age=31536000, immutable",
      "X-Content-Type-Options": "nosniff",
    });
    if (type === "image/svg+xml") {
      // Even a sanitised SVG opened directly must not be able to run anything.
      headers.set(
        "Content-Security-Policy",
        "default-src 'none'; style-src 'unsafe-inline'; sandbox",
      );
    }

    const stream = Readable.toWeb(createReadStream(real)) as ReadableStream<Uint8Array>;
    return new Response(stream, { headers });
  } catch {
    return notFound();
  }
}

function notFound() {
  return new Response("Not found", { status: 404, headers: { "Cache-Control": "no-store" } });
}
