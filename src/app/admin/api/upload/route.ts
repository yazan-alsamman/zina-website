import { getAdminSession } from "@/lib/auth/session";
import { isSameOrigin } from "@/lib/auth/origin";
import { processImage, processLogoPng, storeLogoSvg } from "@/lib/media/process";
import { mediaUrl } from "@/lib/media/url";
import { looksLikeSvg, MAX_UPLOAD_BYTES, validateImageUpload } from "@/lib/media/validate";
import { prisma } from "@/lib/prisma";
import { sanitizeSvg } from "@/lib/sanitize";

/** Image upload for the admin (product images and brand logos). Session + same-origin only. */
export async function POST(request: Request) {
  if (!isSameOrigin(request)) return json({ error: "Cross-site request rejected." }, 403);
  if (!(await getAdminSession())) return json({ error: "Not signed in." }, 401);

  const declared = Number(request.headers.get("content-length") ?? 0);
  if (declared > MAX_UPLOAD_BYTES + 64 * 1024) {
    return json({ error: "Images must be 15 MB or smaller." }, 413);
  }

  let form: FormData;
  try {
    form = await request.formData();
  } catch {
    return json({ error: "Malformed upload." }, 400);
  }
  const file = form.get("file");
  const kind = form.get("kind") === "logo" ? "logo" : "image";
  if (!(file instanceof File)) return json({ error: "Choose a file to upload." }, 400);
  if (file.size > MAX_UPLOAD_BYTES) return json({ error: "Images must be 15 MB or smaller." }, 413);

  const bytes = new Uint8Array(await file.arrayBuffer());

  if (kind === "logo") {
    if (looksLikeSvg(bytes)) {
      const clean = sanitizeSvg(new TextDecoder().decode(bytes));
      if (!clean) return json({ error: "That SVG could not be used." }, 422);
      const relative = await storeLogoSvg(clean);
      return json({ path: relative, url: mediaUrl(relative) });
    }
    const check = validateImageUpload(bytes, file.size);
    if (!check.ok || check.type !== "image/png") {
      return json({ error: "Logos must be SVG or PNG." }, 415);
    }
    const relative = await processLogoPng(Buffer.from(bytes));
    return json({ path: relative, url: mediaUrl(relative) });
  }

  const check = validateImageUpload(bytes, file.size);
  if (!check.ok) return json({ error: check.error }, 415);

  try {
    const processed = await processImage(Buffer.from(bytes), check.type);
    const asset = await prisma.mediaAsset.create({ data: processed });
    const largest = Math.max(...asset.widths);
    return json({
      id: asset.id,
      url: `${asset.dir}/w${largest}.webp`,
      thumb: mediaUrl(`${asset.dir}/w${Math.min(...asset.widths)}.webp`),
      lqip: asset.lqip,
      width: asset.width,
      height: asset.height,
    });
  } catch {
    return json({ error: "The image could not be processed." }, 422);
  }
}

function json(body: unknown, status = 200) {
  return Response.json(body, { status, headers: { "Cache-Control": "no-store" } });
}
