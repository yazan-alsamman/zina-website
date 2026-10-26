import type { Metadata } from "next";
import Link from "next/link";
import { ButtonLink, EmptyState, PageHeader, tableClass } from "@/components/admin/ui";
import { requireAdmin } from "@/lib/auth/session";
import { mediaUrl } from "@/lib/media/url";
import { prisma } from "@/lib/prisma";

export const metadata: Metadata = { title: "Brands" };

export default async function BrandsPage() {
  await requireAdmin();
  const brands = await prisma.brand.findMany({
    orderBy: { name: "asc" },
    include: { _count: { select: { products: true } } },
  });

  return (
    <div className="flex flex-col gap-10">
      <PageHeader
        eyebrow="Catalogue"
        title="Brands"
        description="The houses Zina reviews. Brands with published products also appear in the landing page constellation."
        actions={<ButtonLink href="/admin/brands/new">New brand</ButtonLink>}
      />

      {brands.length === 0 ? (
        <EmptyState
          title="No brands yet"
          body="Add the first house to start building the catalogue."
          action={<ButtonLink href="/admin/brands/new">New brand</ButtonLink>}
        />
      ) : (
        <div className="overflow-x-auto border border-sand-200 bg-white">
          <table className={tableClass.table}>
            <thead className={tableClass.head}>
              <tr>
                <th scope="col">Brand</th>
                <th scope="col">Slug</th>
                <th scope="col">Products</th>
                <th scope="col">Website</th>
              </tr>
            </thead>
            <tbody>
              {brands.map((brand) => (
                <tr key={brand.id} className={tableClass.row}>
                  <td>
                    <Link
                      href={`/admin/brands/${brand.id}`}
                      className="flex items-center gap-4 text-mocha underline-offset-4 hover:underline"
                    >
                      <span className="grid size-10 shrink-0 place-items-center border border-sand-200 bg-white">
                        {brand.logoUrl ? (
                          // eslint-disable-next-line @next/next/no-img-element -- small, already-optimised logo
                          <img
                            src={mediaUrl(brand.logoUrl)}
                            alt=""
                            className="max-h-7 max-w-8 object-contain"
                          />
                        ) : (
                          <span aria-hidden className="font-latin-display text-lg text-sand-700">
                            {brand.name.charAt(0)}
                          </span>
                        )}
                      </span>
                      <span className="font-medium">{brand.name}</span>
                    </Link>
                  </td>
                  <td className="text-sand-700">{brand.slug}</td>
                  <td className="tabular-nums">{brand._count.products}</td>
                  <td className="max-w-[16rem] truncate text-sand-700">
                    {brand.website ? (
                      <a
                        href={brand.website}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="hover:text-mocha"
                      >
                        {brand.website.replace(/^https?:\/\//, "")}
                      </a>
                    ) : (
                      "—"
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
