import { readFile } from "node:fs/promises";
import { join } from "node:path";
import { cacheLife } from "next/cache";
import { ImageResponse } from "next/og";

/**
 * Default share image for every page (product pages use their cover photo instead): the Maison
 * logo (night version, public/brand) on the night-mocha studio backdrop.
 *
 * English is drawn here with next/og in Cormorant. next/og (Satori) cannot shape Arabic script
 * (letters would not join), so Arabic pages serve public/og/ar.png, rendered once in a browser
 * with Noto Naskh Arabic from scripts/og/ar.html.
 */
const size = { width: 1200, height: 630 };
/** Height of the stacked logo (viewBox 322.47 × 220). */
const LOGO_HEIGHT = 300;

const ALT = {
  en: "Zina Al Mokri: honest reviews of the world's finest beauty",
  ar: "زينة المقري: مراجعات صادقة لأرقى منتجات الجمال في العالم",
} as const;

export async function generateImageMetadata({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params;
  return [{ id: "share", size, contentType: "image/png", alt: locale === "ar" ? ALT.ar : ALT.en }];
}

/** Build-time assets, read once and cached (file reads are uncached IO under Cache Components). */
async function asset(path: string): Promise<string> {
  "use cache";
  cacheLife("max");
  return (await readFile(join(process.cwd(), path))).toString("base64");
}

const bytes = (base64: string) => Buffer.from(base64, "base64");

export default async function OpengraphImage({
  params,
}: {
  params: Promise<{ locale: string }>;
  id: Promise<string>;
}) {
  const { locale } = await params;
  if (locale === "ar") {
    const png = bytes(await asset("public/og/ar.png"));
    return new Response(new Uint8Array(png), {
      headers: { "Content-Type": "image/png", "Cache-Control": "public, max-age=86400" },
    });
  }

  const [logo, regular, italic] = await Promise.all([
    asset("public/brand/logo-night.svg"),
    asset("src/assets/fonts/CormorantGaramond-Regular.ttf"),
    asset("src/assets/fonts/CormorantGaramond-Italic.ttf"),
  ]);

  return new ImageResponse(
    <div
      style={{
        width: "100%",
        height: "100%",
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        background:
          "radial-gradient(60% 70% at 50% 38%, rgba(184,164,143,0.42), rgba(184,164,143,0) 70%), linear-gradient(180deg, #4a3f35 0%, #342c25 70%, #211c18 100%)",
        color: "#ffffff",
        fontFamily: "Cormorant",
      }}
    >
      <div
        style={{ fontSize: 30, letterSpacing: 12, color: "#dcd2c7", textTransform: "uppercase" }}
      >
        Beauty, reviewed
      </div>
      {/* eslint-disable-next-line @next/next/no-img-element -- rendered by next/og, not the DOM */}
      <img
        src={`data:image/svg+xml;base64,${logo}`}
        alt=""
        width={Math.round((LOGO_HEIGHT * 322.47) / 220)}
        height={LOGO_HEIGHT}
        style={{ marginTop: 40 }}
      />
      <div style={{ marginTop: 44, fontSize: 40, fontStyle: "italic", color: "#f1ede9" }}>
        Honest reviews of the world&apos;s finest beauty.
      </div>
    </div>,
    {
      ...size,
      fonts: [
        { name: "Cormorant", data: bytes(regular), style: "normal", weight: 400 },
        { name: "Cormorant", data: bytes(italic), style: "italic", weight: 400 },
      ],
    },
  );
}
