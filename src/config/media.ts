/**
 * Every photo slot on the site, in one place. Until real photography exists each slot renders
 * an elegant placeholder frame at the exact aspect ratio the photo will use; set `src`
 * (a /public path or remote URL allowed in next.config) and the real image drops in.
 */
export type MediaTone = "sand" | "mocha" | "mist";

export type MediaSlot = {
  id: string;
  /** CSS aspect-ratio, e.g. "4 / 5" */
  aspect: string;
  src?: string;
  alt: { en: string; ar: string };
  tone: MediaTone;
};

export const media = {
  portrait: {
    id: "portrait",
    aspect: "4 / 5",
    alt: { en: "Portrait of Zina Al Mokri", ar: "صورة زينة المقري" },
    tone: "sand",
  },
  studio: {
    id: "studio",
    aspect: "3 / 4",
    alt: { en: "Zina's review table", ar: "طاولة مراجعات زينة" },
    tone: "mist",
  },
  featured: {
    lipstick: {
      id: "featured-lipstick",
      aspect: "4 / 5",
      alt: { en: "Satin lipstick", ar: "أحمر شفاه ساتان" },
      tone: "sand",
    },
    perfume: {
      id: "featured-perfume",
      aspect: "4 / 5",
      alt: { en: "Eau de parfum bottle", ar: "زجاجة عطر" },
      tone: "mist",
    },
    cream: {
      id: "featured-cream",
      aspect: "4 / 5",
      alt: { en: "Renewal cream jar", ar: "برطمان كريم التجديد" },
      tone: "mocha",
    },
    powder: {
      id: "featured-powder",
      aspect: "4 / 5",
      alt: { en: "Pressed powder compact", ar: "علبة بودرة مضغوطة" },
      tone: "sand",
    },
  },
  instagram: [
    {
      id: "ig-1",
      aspect: "4 / 5",
      alt: { en: "Instagram post", ar: "منشور على إنستغرام" },
      tone: "sand",
    },
    {
      id: "ig-2",
      aspect: "1 / 1",
      alt: { en: "Instagram post", ar: "منشور على إنستغرام" },
      tone: "mocha",
    },
    {
      id: "ig-3",
      aspect: "3 / 4",
      alt: { en: "Instagram post", ar: "منشور على إنستغرام" },
      tone: "mist",
    },
    {
      id: "ig-4",
      aspect: "1 / 1",
      alt: { en: "Instagram post", ar: "منشور على إنستغرام" },
      tone: "mist",
    },
    {
      id: "ig-5",
      aspect: "3 / 4",
      alt: { en: "Instagram post", ar: "منشور على إنستغرام" },
      tone: "sand",
    },
    {
      id: "ig-6",
      aspect: "4 / 5",
      alt: { en: "Instagram post", ar: "منشور على إنستغرام" },
      tone: "mocha",
    },
  ],
} satisfies {
  portrait: MediaSlot;
  studio: MediaSlot;
  featured: Record<string, MediaSlot>;
  instagram: MediaSlot[];
};
