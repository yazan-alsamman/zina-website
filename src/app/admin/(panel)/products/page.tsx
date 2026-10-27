import type { Metadata } from "next";
import { LocalTime } from "@/components/LocalTime";
import Link from "next/link";
import type { Prisma } from "@/generated/prisma/client";
import { SmartImage } from "@/components/media/SmartImage";
import {
  buttonClass,
  ButtonLink,
  EmptyState,
  inputClass,
  PageHeader,
  PublishedBadge,
  tableClass,
} from "@/components/admin/ui";
import { requireAdmin } from "@/lib/auth/session";
import { formatMoney } from "@/lib/money";
import { prisma } from "@/lib/prisma";

export const metadata: Metadata = { title: "Products" };

const SORTS = {
  newest: { createdAt: "desc" },
  oldest: { createdAt: "asc" },
  "price-high": { price: "desc" },
  "price-low": { price: "asc" },
} as const satisfies Record<string, Prisma.ProductOrderByWithRelationInput>;

type Search = { q?: string; brand?: string; status?: string; sort?: string };

export default async function ProductsPage({ searchParams }: PageProps<"/admin/products">) {
  await requireAdmin();
  const params = (await searchParams) as Search;
  const q = (params.q ?? "").trim().slice(0, 80);
  const sort = (params.sort ?? "newest") in SORTS ? (params.sort as keyof typeof SORTS) : "newest";

  const where: Prisma.ProductWhereInput = {
    ...(q
      ? {
          OR: [
            { nameEn: { contains: q, mode: "insensitive" } },
            { nameAr: { contains: q } },
            { slug: { contains: q.toLowerCase() } },
          ],
        }
      : {}),
    ...(params.brand ? { brandId: params.brand } : {}),
    ...(params.status === "published"
      ? { isPublished: true }
      : params.status === "draft"
        ? { isPublished: false }
        : {}),
  };

  const [products, brands, total] = await Promise.all([
    prisma.product.findMany({
      where,
      orderBy: SORTS[sort],
      take: 100,
      include: {
        brand: { select: { name: true } },
        images: { orderBy: { sortOrder: "asc" }, take: 1, include: { asset: true } },
      },
    }),
    prisma.brand.findMany({ orderBy: { name: "asc" }, select: { id: true, name: true } }),
    prisma.product.count(),
  ]);

  const filtered = Boolean(q || params.brand || params.status);

  return (
    <div className="flex flex-col gap-10">
      <PageHeader
        eyebrow="Catalogue"
        title="Products"
        description="Everything Zina has reviewed. Only published products are visible on the site."
        actions={<ButtonLink href="/admin/products/new">New product</ButtonLink>}
      />

      <form className="grid gap-3 md:grid-cols-[1fr_12rem_10rem_11rem_auto]" role="search">
        <label className="sr-only" htmlFor="q">
          Search products
        </label>
        <input
          id="q"
          name="q"
          defaultValue={q}
          placeholder="Search by name or slug"
          className={inputClass}
        />
        <label className="sr-only" htmlFor="brand">
          Brand
        </label>
        <select id="brand" name="brand" defaultValue={params.brand ?? ""} className={inputClass}>
          <option value="">All brands</option>
          {brands.map((brand) => (
            <option key={brand.id} value={brand.id}>
              {brand.name}
            </option>
          ))}
        </select>
        <label className="sr-only" htmlFor="status">
          Status
        </label>
        <select id="status" name="status" defaultValue={params.status ?? ""} className={inputClass}>
          <option value="">Any status</option>
          <option value="published">Published</option>
          <option value="draft">Draft</option>
        </select>
        <label className="sr-only" htmlFor="sort">
          Sort
        </label>
        <select id="sort" name="sort" defaultValue={sort} className={inputClass}>
          <option value="newest">Newest first</option>
          <option value="oldest">Oldest first</option>
          <option value="price-high">Price, high to low</option>
          <option value="price-low">Price, low to high</option>
        </select>
        <button type="submit" className={buttonClass.secondary}>
          Apply
        </button>
      </form>

      {products.length === 0 ? (
        <EmptyState
          title={total === 0 ? "No products yet" : "Nothing matches"}
          body={
            total === 0
              ? "Create the first product Zina has reviewed."
              : "Try a different search or clear the filters."
          }
          action={
            total === 0 ? (
              <ButtonLink href="/admin/products/new">New product</ButtonLink>
            ) : (
              <Link href="/admin/products" className={buttonClass.quiet}>
                Clear filters
              </Link>
            )
          }
        />
      ) : (
        <div className="overflow-x-auto border border-sand-200 bg-white">
          {filtered ? (
            <p className="border-b border-sand-200 px-4 py-3 text-xs text-sand-700">
              {products.length} of {total} products
            </p>
          ) : null}
          <table className={tableClass.table}>
            <thead className={tableClass.head}>
              <tr>
                <th scope="col">Product</th>
                <th scope="col">Brand</th>
                <th scope="col" className="text-end">
                  Price
                </th>
                <th scope="col">Status</th>
                <th scope="col">Updated</th>
              </tr>
            </thead>
            <tbody>
              {products.map((product) => {
                const cover = product.images[0];
                return (
                  <tr key={product.id} className={tableClass.row}>
                    <td>
                      <Link
                        href={`/admin/products/${product.id}`}
                        className="flex items-center gap-4"
                      >
                        <span className="block w-12 shrink-0 overflow-hidden border border-sand-200 bg-mist">
                          {cover?.asset ? (
                            <SmartImage
                              asset={cover.asset}
                              alt=""
                              sizes="48px"
                              className="aspect-square object-cover"
                            />
                          ) : (
                            <span className="block aspect-square" />
                          )}
                        </span>
                        <span className="flex flex-col">
                          <span className="font-medium text-mocha underline-offset-4 hover:underline">
                            {product.nameEn}
                          </span>
                          <span className="text-xs text-sand-700" dir="rtl" lang="ar">
                            {product.nameAr}
                          </span>
                        </span>
                      </Link>
                    </td>
                    <td className="text-sand-700">{product.brand.name}</td>
                    <td className="text-end tabular-nums">
                      {formatMoney(product.price, product.currency)}
                    </td>
                    <td>
                      <span className="flex flex-wrap items-center gap-2">
                        <PublishedBadge published={product.isPublished} />
                        {product.isFeatured ? (
                          <span className="text-xs text-sand-700">
                            Featured{product.featuredOrder ? ` · ${product.featuredOrder}` : ""}
                          </span>
                        ) : null}
                      </span>
                    </td>
                    <td className="text-sand-700">
                      <LocalTime
                        value={product.updatedAt.toISOString()}
                        options={{ day: "numeric", month: "short" }}
                        utcLabel={false}
                      />
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
