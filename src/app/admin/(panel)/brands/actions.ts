"use server";

import { revalidatePath, updateTag } from "next/cache";
import { redirect } from "next/navigation";
import { type ActionState, brandSchema, fieldErrors, submittedValues } from "@/lib/admin/schemas";
import { requireAdmin } from "@/lib/auth/session";
import { BRANDS_TAG } from "@/lib/cache-tags";
import { prisma } from "@/lib/prisma";
import { uniqueSlug } from "@/lib/slug";

export async function saveBrandAction(
  _prev: ActionState,
  formData: FormData,
): Promise<ActionState> {
  await requireAdmin();
  const id = typeof formData.get("id") === "string" ? String(formData.get("id")) : "";

  const parsed = brandSchema.safeParse({
    name: formData.get("name") ?? "",
    slug: formData.get("slug") ?? "",
    website: formData.get("website") ?? "",
    logoPath: formData.get("logoPath") ?? "",
  });
  if (!parsed.success) return fieldErrors(parsed.error, formData);
  const data = parsed.data;

  const slug = await uniqueSlug(
    data.slug || data.name,
    async (candidate) => {
      const existing = await prisma.brand.findUnique({
        where: { slug: candidate },
        select: { id: true },
      });
      return Boolean(existing && existing.id !== id);
    },
    "brand",
  );
  if (data.slug && slug !== data.slug) {
    return {
      ok: false,
      errors: { slug: [`"${data.slug}" is taken. Try "${slug}".`] },
      values: submittedValues(formData),
    };
  }

  const record = { name: data.name, slug, website: data.website, logoUrl: data.logoPath };
  if (id) {
    const exists = await prisma.brand.findUnique({ where: { id }, select: { id: true } });
    if (!exists) return { ok: false, message: "This brand no longer exists." };
    await prisma.brand.update({ where: { id }, data: record });
  } else {
    await prisma.brand.create({ data: record });
  }

  updateTag(BRANDS_TAG);
  revalidatePath("/admin/brands");
  redirect("/admin/brands");
}

export async function deleteBrandAction(
  _prev: ActionState,
  formData: FormData,
): Promise<ActionState> {
  await requireAdmin();
  const id = String(formData.get("id") ?? "");
  const brand = await prisma.brand.findUnique({
    where: { id },
    select: { id: true, _count: { select: { products: true } } },
  });
  if (!brand) return { ok: false, message: "This brand no longer exists." };
  if (brand._count.products > 0) {
    return {
      ok: false,
      message: `This brand still has ${brand._count.products} product${brand._count.products > 1 ? "s" : ""}. Move or delete them first.`,
    };
  }
  await prisma.brand.delete({ where: { id } });
  updateTag(BRANDS_TAG);
  revalidatePath("/admin/brands");
  redirect("/admin/brands");
}
