import { media, type MediaSlot } from "./media";

/**
 * PLACEHOLDER content for "The Edit" until the admin publishes real reviewed products
 * (Prisma `Product` with `isPublished`). Names, ratings, quotes and prices are illustrative.
 */
export type FeaturedReview = {
  slug: string;
  brand: string;
  product: { en: string; ar: string };
  /** Zina's rating out of 5 */
  rating: number;
  quote: { en: string; ar: string };
  price: number;
  currency: string;
  image: MediaSlot;
  placeholder: true;
};

export const featuredReviews: readonly FeaturedReview[] = [
  {
    slug: "satin-lipstick",
    brand: "Charlotte Tilbury",
    product: { en: "Satin lipstick", ar: "أحمر شفاه ساتان" },
    rating: 4.8,
    quote: {
      en: "Glides on like balm, wears like a stain. The nude I reach for first.",
      ar: "ينزلق كالبلسم ويثبت كالصبغة. اللون النود الذي أختاره أولًا.",
    },
    price: 38,
    currency: "USD",
    image: media.featured.lipstick,
    placeholder: true,
  },
  {
    slug: "eau-de-parfum",
    brand: "Guerlain",
    product: { en: "Eau de parfum", ar: "ماء العطر" },
    rating: 4.6,
    quote: {
      en: "Soft iris on the skin for hours. Quiet, never shy.",
      ar: "سوسن ناعم يبقى على البشرة لساعات. هادئ، لكنه حاضر.",
    },
    price: 145,
    currency: "USD",
    image: media.featured.perfume,
    placeholder: true,
  },
  {
    slug: "renewal-cream",
    brand: "La Mer",
    product: { en: "Renewal cream", ar: "كريم التجديد" },
    rating: 4.9,
    quote: {
      en: "Rich without weight. My skin looked rested by the second week.",
      ar: "غني دون ثقل. بدت بشرتي مرتاحة منذ الأسبوع الثاني.",
    },
    price: 210,
    currency: "USD",
    image: media.featured.cream,
    placeholder: true,
  },
  {
    slug: "pressed-powder",
    brand: "Dior",
    product: { en: "Pressed powder", ar: "بودرة مضغوطة" },
    rating: 4.5,
    quote: {
      en: "Blurs without a trace of powder. A true finishing touch.",
      ar: "تُنعّم البشرة دون أثر للبودرة. لمسة أخيرة حقيقية.",
    },
    price: 62,
    currency: "USD",
    image: media.featured.powder,
    placeholder: true,
  },
];
