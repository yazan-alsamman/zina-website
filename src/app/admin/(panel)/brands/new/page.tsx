import type { Metadata } from "next";
import { PageHeader } from "@/components/admin/ui";
import { requireAdmin } from "@/lib/auth/session";
import { BrandForm } from "../BrandForm";

export const metadata: Metadata = { title: "New brand" };

export default async function NewBrandPage() {
  await requireAdmin();
  return (
    <div className="flex flex-col gap-10">
      <PageHeader eyebrow="Brands" title="New brand" />
      <BrandForm />
    </div>
  );
}
