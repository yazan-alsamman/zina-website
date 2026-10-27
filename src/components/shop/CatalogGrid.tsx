import type { Locale } from "@/i18n/routing";
import { cn } from "@/lib/cn";
import type { CatalogProduct } from "@/lib/shop/types";
import { ProductCard } from "./ProductCard";

/**
 * Editorial rhythm rather than a shop grid. On large screens the layout repeats every six
 * products: a large feature with a smaller companion set lower, a row of three with the middle
 * one dropped, then a single square piece set off-centre. Phones alternate one full-width piece
 * with a pair.
 */
const LARGE = [
  { cell: "lg:col-span-7", aspect: "4 / 5", sizes: "(min-width: 1024px) 55vw" },
  {
    cell: "lg:col-span-4 lg:col-start-9 lg:mt-[38%]",
    aspect: "4 / 5",
    sizes: "(min-width: 1024px) 30vw",
  },
  { cell: "lg:col-span-4", aspect: "4 / 5", sizes: "(min-width: 1024px) 30vw" },
  { cell: "lg:col-span-4 lg:mt-[22%]", aspect: "4 / 5", sizes: "(min-width: 1024px) 30vw" },
  { cell: "lg:col-span-4", aspect: "4 / 5", sizes: "(min-width: 1024px) 30vw" },
  { cell: "lg:col-span-5 lg:col-start-5", aspect: "1 / 1", sizes: "(min-width: 1024px) 40vw" },
] as const;

export function CatalogGrid({
  products,
  locale,
}: {
  products: readonly CatalogProduct[];
  locale: Locale;
}) {
  return (
    <ul className="grid grid-cols-2 gap-x-4 gap-y-14 sm:gap-x-8 md:gap-y-20 lg:grid-cols-12 lg:gap-x-10 lg:gap-y-28">
      {products.map((product, index) => {
        const large = LARGE[index % LARGE.length];
        const phoneFull = index % 3 === 0;
        return (
          <li
            key={product.id}
            className={cn(
              phoneFull ? "col-span-2" : "col-span-1",
              "md:col-span-1 md:max-lg:even:mt-[24%]",
              large.cell,
            )}
          >
            <ProductCard
              product={product}
              locale={locale}
              aspect={large.aspect}
              priority={index < 2}
              sizes={`${large.sizes}, (min-width: 768px) 45vw, ${phoneFull ? "92vw" : "46vw"}`}
            />
          </li>
        );
      })}
    </ul>
  );
}
