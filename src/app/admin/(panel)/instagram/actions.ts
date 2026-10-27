"use server";

import { revalidatePath, updateTag } from "next/cache";
import { type ActionState, fieldErrors, manualPostSchema } from "@/lib/admin/schemas";
import { requireAdmin } from "@/lib/auth/session";
import { INSTAGRAM_TAG } from "@/lib/cache-tags";
import { syncInstagram } from "@/lib/instagram/sync";
import { prisma } from "@/lib/prisma";

function refresh() {
  updateTag(INSTAGRAM_TAG); // landing and journal show the change right away
  revalidatePath("/admin/instagram");
}

export async function syncNowAction(): Promise<ActionState> {
  await requireAdmin();
  const status = await syncInstagram();
  refresh();
  return { ok: status.ok, message: status.message };
}

export async function setHiddenAction(
  _prev: ActionState,
  formData: FormData,
): Promise<ActionState> {
  await requireAdmin();
  const id = String(formData.get("id") ?? "");
  const hidden = formData.get("hidden") === "true";
  const { count } = await prisma.instagramPost.updateMany({
    where: { id },
    data: { isHidden: hidden },
  });
  if (count !== 1) return { ok: false, message: "This post no longer exists." };
  refresh();
  return { ok: true };
}

export async function deleteManualPostAction(
  _prev: ActionState,
  formData: FormData,
): Promise<ActionState> {
  await requireAdmin();
  const id = String(formData.get("id") ?? "");
  const { count } = await prisma.instagramPost.deleteMany({ where: { id, isManual: true } });
  if (count !== 1) return { ok: false, message: "Only manual posts can be deleted." };
  refresh();
  return { ok: true };
}

/** Fallback while the API is not connected: show a post added by hand. */
export async function createManualPostAction(
  _prev: ActionState,
  formData: FormData,
): Promise<ActionState> {
  await requireAdmin();
  const parsed = manualPostSchema.safeParse({
    assetId: formData.get("assetId") ?? "",
    caption: formData.get("caption") ?? "",
    permalink: formData.get("permalink") ?? "",
    mediaType: formData.get("mediaType") ?? "IMAGE",
    postedOn: formData.get("postedOn") ?? "",
  });
  if (!parsed.success) return fieldErrors(parsed.error, formData);
  const data = parsed.data;

  const asset = await prisma.mediaAsset.findUnique({ where: { id: data.assetId } });
  if (!asset) return { ok: false, errors: { assetId: ["Upload the image again."] } };

  await prisma.instagramPost.create({
    data: {
      id: `manual_${asset.id}`,
      caption: data.caption,
      mediaType: data.mediaType,
      permalink: data.permalink,
      timestamp: data.postedOn ? new Date(data.postedOn) : new Date(),
      localImagePath: asset.dir,
      localVideoPosterPath: data.mediaType === "VIDEO" ? asset.dir : null,
      width: asset.width,
      height: asset.height,
      isManual: true,
      assetId: asset.id,
    },
  });
  refresh();
  return { ok: true, message: "Post added. It shows on the landing page and the journal." };
}
