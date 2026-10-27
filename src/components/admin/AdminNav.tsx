"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/cn";

const ITEMS = [
  { href: "/admin", label: "Overview", exact: true },
  { href: "/admin/orders", label: "Orders" },
  { href: "/admin/products", label: "Products" },
  { href: "/admin/brands", label: "Brands" },
  { href: "/admin/instagram", label: "Instagram" },
] as const;

export function AdminNav() {
  const pathname = usePathname();

  return (
    <nav aria-label="Admin">
      <ul className="flex gap-5 overflow-x-auto md:flex-col md:gap-1">
        {ITEMS.map((item) => {
          const active = "exact" in item ? pathname === item.href : pathname.startsWith(item.href);
          return (
            <li key={item.href}>
              <Link
                href={item.href}
                aria-current={active ? "page" : undefined}
                className={cn(
                  "label block border-b py-2 tracking-[0.16em] whitespace-nowrap transition-colors duration-300 md:border-s md:border-b-0 md:py-2.5 md:ps-4 md:tracking-[0.28em]",
                  active
                    ? "border-sand text-white"
                    : "border-transparent text-sand-200 hover:text-white",
                )}
              >
                {item.label}
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}
