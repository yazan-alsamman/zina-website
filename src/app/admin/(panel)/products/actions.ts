"use server";

import { revalidatePath, updateTag } from "next/cache";
import { redirect } from "next/navigation";
import { type ActionState, fieldErrors, productSchema, submittedValues } from "@/lib/admin/schemas";
import { requireAdmin } from "@/lib/auth/session";
import { BRANDS_TAG, PRODUCTS_TAG } from "@/lib/cache-tags";
import { fromCents, parseAmount } from "@/lib/money";
import { prisma } from "@/lib/prisma";
import { uniqueSlug } from "@/lib/slug";

function parseImages(raw: FormDataEntryValue | null): unknown {
  if (typeof raw !== "string" || raw === "") return [];
  try {
    return JSON.parse(raw);
  } catch {
    return null; // rejected by the schema below
  }
}

export async function saveProductAction(
  _prev: ActionState,
  formData: FormData,
): Promise<ActionState> {
  await requireAdmin();
  const id = String(formData.get("id") ?? "");
  const text = (key: string) => String(formData.get(key) ?? "");

  const parsed = productSchema.safeParse({
    nameEn: text("nameEn"),
    nameAr: text("nameAr"),
    descriptionEn: text("descriptionEn"),
    descriptionAr: text("descriptionAr"),
    reviewEn: text("reviewEn"),
    reviewAr: text("reviewAr"),
    rating: text("rating"),
    price: text("price"),
    currency: text("currency") || "USD",
    stock: text("stock"),
    brandId: text("brandId"),
    isPublished: formData.get("isPublished") === "on",
    isFeatured: formData.get("isFeatured") === "on",
    featuredOrder: text("featuredOrder"),
    slug: text("slug"),
    images: parseImages(formData.get("images")),
  });
  if (!parsed.success) return fieldErrors(parsed.error, formData);
  const data = parsed.data;

  const [brand, assets] = await Promise.all([
    prisma.brand.findUnique({ where: { id: data.brandId }, select: { id: true } }),
    prisma.mediaAsset.findMany({
      where: { id: { in: data.images.map((image) => image.assetId) } },
      select: { id: true, dir: true, widths: true },
    }),
  ]);
  if (!brand)
    return {
      ok: false,
      errors: { brandId: ["Choose a brand"] },
      values: submittedValues(formData),
    };
  if (assets.length !== new Set(data.images.map((image) => image.assetId)).size) {
    return {
      ok: false,
      errors: { images: ["One of the images is missing. Upload it again."] },
      values: submittedValues(formData),
    };
  }
  if (data.isPublished && data.images.length === 0) {
    return {
      ok: false,
      errors: { images: ["Add at least one image before publishing"] },
      values: submittedValues(formData),
    };
  }

  const slug = await uniqueSlug(
    data.slug || data.nameEn,
    async (candidate) => {
      const existing = await prisma.product.findUnique({
        where: { slug: candidate },
        select: { id: true },
      });
      return Boolean(existing && existing.id !== id);
    },
    "product",
  );
  if (data.slug && slug !== data.slug) {
    return {
      ok: false,
      errors: { slug: [`"${data.slug}" is taken. Try "${slug}".`] },
      values: submittedValues(formData),
    };
  }

  const assetById = new Map(assets.map((asset) => [asset.id, asset]));
  const images = data.images.map((image, index) => {
    const asset = assetById.get(image.assetId)!;
    return {
      assetId: asset.id,
      url: `${asset.dir}/w${Math.max(...asset.widths)}.webp`,
      altEn: image.altEn,
      altAr: image.altAr,
      sortOrder: index, // 0 = cover
    };
  });

  const record = {
    slug,
    nameEn: data.nameEn,
    nameAr: data.nameAr,
    descriptionEn: data.descriptionEn,
    descriptionAr: data.descriptionAr,
    reviewEn: data.reviewEn,
    reviewAr: data.reviewAr,
    rating: data.rating,
    price: fromCents(parseAmount(data.price)!),
    currency: data.currency,
    stock: data.stock,
    isPublished: data.isPublished,
    isFeatured: data.isFeatured,
    featuredOrder: data.isFeatured ? data.featuredOrder : null,
    brandId: data.brandId,
  };

  const saved = await prisma.$transaction(async (tx) => {
    if (id) {
      const exists = await tx.product.findUnique({ where: { id }, select: { id: true } });
      if (!exists) return null;
      await tx.productImage.deleteMany({ where: { productId: id } });
      return tx.product.update({ where: { id }, data: { ...record, images: { create: images } } });
    }
    return tx.product.create({ data: { ...record, images: { create: images } } });
  });
  if (!saved) return { ok: false, message: "This product no longer exists." };

  updateTag(PRODUCTS_TAG);
  updateTag(BRANDS_TAG); // brands with published products feed the landing constellation
  revalidatePath("/admin/products");
  redirect(`/admin/products/${saved.id}?saved=1`);
}

export async function deleteProductAction(
  _prev: ActionState,
  formData: FormData,
): Promise<ActionState> {
  await requireAdmin();
  const id = String(formData.get("id") ?? "");
  const product = await prisma.product.findUnique({
    where: { id },
    select: { _count: { select: { orderItems: true } } },
  });
  if (!product) return { ok: false, message: "This product no longer exists." };
  if (product._count.orderItems > 0) {
    return {
      ok: false,
      message:
        "This product appears on orders, so it is kept for the records. Unpublish it instead.",
    };
  }
  await prisma.product.delete({ where: { id } });
  updateTag(PRODUCTS_TAG);
  updateTag(BRANDS_TAG);
  revalidatePath("/admin/products");
  redirect("/admin/products");
}
