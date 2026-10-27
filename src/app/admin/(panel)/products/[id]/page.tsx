import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { PageHeader, PublishedBadge } from "@/components/admin/ui";
import { requireAdmin } from "@/lib/auth/session";
import { mediaUrl } from "@/lib/media/url";
import { prisma } from "@/lib/prisma";
import { ProductForm } from "../ProductForm";

export const metadata: Metadata = { title: "Edit product" };

export default async function EditProductPage({
  params,
  searchParams,
}: PageProps<"/admin/products/[id]">) {
  await requireAdmin();
  const { id } = await params;
  const { saved } = (await searchParams) as { saved?: string };

  const [product, brands] = await Promise.all([
    prisma.product.findUnique({
      where: { id },
      include: { images: { orderBy: { sortOrder: "asc" }, include: { asset: true } } },
    }),
    prisma.brand.findMany({ orderBy: { name: "asc" }, select: { id: true, name: true } }),
  ]);
  if (!product) notFound();

  return (
    <div className="flex flex-col gap-10">
      <PageHeader
        eyebrow="Products"
        title={product.nameEn}
        description={<PublishedBadge published={product.isPublished} />}
      />
      {saved ? (
        <p
          role="status"
          className="border border-sand-200 bg-sand-100 px-4 py-3 text-sm text-mocha"
        >
          Saved. Public pages update right away.
        </p>
      ) : null}
      <ProductForm
        brands={brands}
        product={{
          id: product.id,
          slug: product.slug,
          nameEn: product.nameEn,
          nameAr: product.nameAr,
          descriptionEn: product.descriptionEn ?? "",
          descriptionAr: product.descriptionAr ?? "",
          reviewEn: product.reviewEn ?? "",
          reviewAr: product.reviewAr ?? "",
          rating: product.rating ? Number(product.rating).toFixed(1) : "",
          price: product.price.toFixed(2),
          currency: product.currency,
          stock: product.stock === null ? "" : String(product.stock),
          brandId: product.brandId,
          isPublished: product.isPublished,
          isFeatured: product.isFeatured,
          featuredOrder: product.featuredOrder === null ? "" : String(product.featuredOrder),
          images: product.images
            .filter((image) => image.asset)
            .map((image) => ({
              assetId: image.asset!.id,
              thumb: mediaUrl(`${image.asset!.dir}/w${Math.min(...image.asset!.widths)}.webp`),
              lqip: image.asset!.lqip,
              altEn: image.altEn,
              altAr: image.altAr,
            })),
        }}
      />
    </div>
  );
}
