import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { PageHeader } from "@/components/admin/ui";
import { requireAdmin } from "@/lib/auth/session";
import { mediaUrl } from "@/lib/media/url";
import { prisma } from "@/lib/prisma";
import { BrandForm } from "../BrandForm";

export const metadata: Metadata = { title: "Edit brand" };

export default async function EditBrandPage({ params }: PageProps<"/admin/brands/[id]">) {
  await requireAdmin();
  const { id } = await params;
  const brand = await prisma.brand.findUnique({
    where: { id },
    include: { _count: { select: { products: true } } },
  });
  if (!brand) notFound();

  return (
    <div className="flex flex-col gap-10">
      <PageHeader eyebrow="Brands" title={brand.name} />
      <BrandForm
        brand={{
          id: brand.id,
          name: brand.name,
          slug: brand.slug,
          website: brand.website,
          logoPath: brand.logoUrl,
          logoUrl: brand.logoUrl ? mediaUrl(brand.logoUrl) : null,
          productCount: brand._count.products,
        }}
      />
    </div>
  );
}
