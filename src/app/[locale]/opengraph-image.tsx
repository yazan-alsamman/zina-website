import { readFile } from "node:fs/promises";
import { join } from "node:path";
import { ImageResponse } from "next/og";

/**
 * Default share image for every page (product pages use their cover photo instead): the
 * wordmark on the night-mocha studio backdrop, in the brand's Cormorant. Generated at build.
 * Latin only: the OG renderer does not shape Arabic script, so both languages share it.
 */
export const alt = "Zina Al Mokri: honest reviews of the world's finest beauty";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

const fonts = join(process.cwd(), "src/assets/fonts");

export default async function OpengraphImage() {
  const [regular, italic] = await Promise.all([
    readFile(join(fonts, "CormorantGaramond-Regular.ttf")),
    readFile(join(fonts, "CormorantGaramond-Italic.ttf")),
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
      <div
        style={{
          marginTop: 34,
          fontSize: 96,
          letterSpacing: 30,
          paddingLeft: 30,
          textTransform: "uppercase",
        }}
      >
        Zina Al Mokri
      </div>
      <div style={{ marginTop: 42, width: 120, height: 1, background: "#b8a48f" }} />
      <div style={{ marginTop: 40, fontSize: 40, fontStyle: "italic", color: "#f1ede9" }}>
        Honest reviews of the world&apos;s finest beauty.
      </div>
    </div>,
    {
      ...size,
      fonts: [
        { name: "Cormorant", data: regular, style: "normal", weight: 400 },
        { name: "Cormorant", data: italic, style: "italic", weight: 400 },
      ],
    },
  );
}
