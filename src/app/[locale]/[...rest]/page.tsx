import { notFound } from "next/navigation";

// This segment never renders UI, so there is no navigation to validate as instant.
export const instant = false;

// Unknown paths under a locale render the localized not-found page.
export default function CatchAllPage() {
  notFound();
}
