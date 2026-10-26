import type { Metadata } from "next";
import { ButtonLink, EmptyState, PageHeader } from "@/components/admin/ui";
import { requireAdmin } from "@/lib/auth/session";
import { prisma } from "@/lib/prisma";
import { ProductForm } from "../ProductForm";

export const metadata: Metadata = { title: "New product" };

export default async function NewProductPage() {
  await requireAdmin();
  const brands = await prisma.brand.findMany({
    orderBy: { name: "asc" },
    select: { id: true, name: true },
  });

  return (
    <div className="flex flex-col gap-10">
      <PageHeader
        eyebrow="Products"
        title="New product"
        description="Write both languages side by side. Save as a draft until it is ready."
      />
      {brands.length === 0 ? (
        <EmptyState
          title="Add a brand first"
          body="Every product belongs to a brand."
          action={<ButtonLink href="/admin/brands/new">New brand</ButtonLink>}
        />
      ) : (
        <ProductForm brands={brands} />
      )}
    </div>
  );
}
