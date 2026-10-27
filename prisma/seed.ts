import "dotenv/config";
import { PrismaPg } from "@prisma/adapter-pg";
import sharp from "sharp";
import {
  type OrderStatus,
  type PaymentMethod,
  type Product,
  PrismaClient,
} from "../src/generated/prisma/client";
import { hashPassword } from "../src/lib/auth/password";
import { processImage } from "../src/lib/media/process";
import { computeSubtotal, computeTotal, fromCents } from "../src/lib/money";
import { formatOrderNumber } from "../src/lib/orders/number";
import { createPublicToken } from "../src/lib/orders/token";

const prisma = new PrismaClient({
  adapter: new PrismaPg({ connectionString: process.env.DATABASE_URL! }),
});

/** First admin from ADMIN_EMAIL / ADMIN_PASSWORD, only when no admin exists yet. */
async function seedAdmin() {
  if ((await prisma.adminUser.count()) > 0) {
    console.log("• Admin already exists, skipping.");
    return;
  }
  const email = process.env.ADMIN_EMAIL?.trim().toLowerCase();
  const password = process.env.ADMIN_PASSWORD;
  if (!email || !password) {
    console.warn("• ADMIN_EMAIL / ADMIN_PASSWORD not set: no admin created.");
    return;
  }
  if (password.length < 12) throw new Error("ADMIN_PASSWORD must be at least 12 characters.");
  await prisma.adminUser.create({
    data: {
      email,
      name: process.env.ADMIN_NAME?.trim() || "Zina",
      passwordHash: await hashPassword(password),
    },
  });
  console.log(`• Created admin ${email}.`);
}

type Tones = [string, string, string];

/**
 * Placeholder product photography through the real media pipeline: a tonal studio backdrop with
 * either a serif monogram (cover) or a soft still-life silhouette (second image).
 */
async function placeholderImage(letter: string, tones: Tones, variant: "monogram" | "still") {
  const motif =
    variant === "monogram"
      ? `<text x="800" y="1220" font-family="Georgia, serif" font-size="760" fill="#ffffff" fill-opacity="0.28" text-anchor="middle">${letter}</text>`
      : `<ellipse cx="800" cy="1640" rx="520" ry="70" fill="#000" fill-opacity="0.12"/>
         <rect x="610" y="760" width="380" height="880" rx="56" fill="#ffffff" fill-opacity="0.22"/>
         <rect x="680" y="560" width="240" height="230" rx="18" fill="#ffffff" fill-opacity="0.32"/>
         <rect x="650" y="820" width="70" height="760" rx="35" fill="#ffffff" fill-opacity="0.16"/>`;
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="1600" height="2000">
    <defs>
      <radialGradient id="g" cx="${variant === "monogram" ? "30%" : "68%"}" cy="22%" r="95%">
        <stop offset="0" stop-color="${tones[0]}"/><stop offset="0.55" stop-color="${tones[1]}"/><stop offset="1" stop-color="${tones[2]}"/>
      </radialGradient>
    </defs>
    <rect width="1600" height="2000" fill="url(#g)"/>
    ${motif}
  </svg>`;
  const jpeg = await sharp(Buffer.from(svg)).jpeg({ quality: 90 }).toBuffer();
  const processed = await processImage(jpeg, "image/jpeg");
  return prisma.mediaAsset.create({ data: processed });
}

const SAND: Tones = ["#f1ede9", "#b8a48f", "#7c6c5e"];
const MOCHA: Tones = ["#7c6c5e", "#4a3f35", "#211c18"];
const MIST: Tones = ["#ffffff", "#eaeaea", "#b8a48f"];

type SampleProduct = {
  slug: string;
  brand: string;
  tones: Tones;
  price: string;
  rating: number;
  published: boolean;
  featured?: number;
  stock?: number;
  nameEn: string;
  nameAr: string;
  descriptionEn: string;
  descriptionAr: string;
  reviewEn: string;
  reviewAr: string;
};

async function seedSamples() {
  const brandData = [
    { name: "Dior", slug: "dior", website: "https://www.dior.com" },
    { name: "Chanel", slug: "chanel", website: "https://www.chanel.com" },
    { name: "Guerlain", slug: "guerlain", website: "https://www.guerlain.com" },
    { name: "La Mer", slug: "la-mer", website: "https://www.cremedelamer.com" },
    {
      name: "Charlotte Tilbury",
      slug: "charlotte-tilbury",
      website: "https://www.charlottetilbury.com",
    },
  ];
  const brands = Object.fromEntries(
    await Promise.all(
      brandData.map(async (b) => [
        b.slug,
        await prisma.brand.upsert({ where: { slug: b.slug }, update: {}, create: b }),
      ]),
    ),
  );

  // The first four keep their positions: the sample orders below refer to them by index.
  const productData: SampleProduct[] = [
    {
      slug: "sample-satin-lipstick",
      brand: "dior",
      tones: SAND,
      price: "48.00",
      rating: 4.5,
      published: true,
      featured: 1,
      nameEn: "Satin Lipstick",
      nameAr: "أحمر شفاه ساتان",
      descriptionEn: "A creamy satin finish with a soft, comfortable feel.",
      descriptionAr: "لمسة ساتان كريمية بإحساس ناعم ومريح.",
      reviewEn:
        "Glides on like balm and wears like a stain. The nude I reach for first.\n\n- Comfortable all day\n- **Buildable** colour, never patchy",
      reviewAr:
        "ينزلق كالبلسم ويثبت كالصبغة. اللون النود الذي أختاره أولًا.\n\n- مريح طوال اليوم\n- لون **قابل للتدرّج** دون بقع",
    },
    {
      slug: "sample-eau-de-parfum",
      brand: "chanel",
      tones: MIST,
      price: "165.00",
      rating: 5,
      published: true,
      featured: 2,
      nameEn: "Eau de Parfum",
      nameAr: "ماء العطر",
      descriptionEn: "Soft iris and warm musk.",
      descriptionAr: "سوسن ناعم ومسك دافئ.",
      reviewEn:
        "Quiet, never shy. **Lasts eight hours** on my skin and settles into a warm, clean musk.\n\nTwo sprays are enough for a whole evening.",
      reviewAr:
        "هادئ لكنه حاضر. **يدوم ثماني ساعات** على بشرتي ويستقر في مسك دافئ ونظيف.\n\nبختان تكفيان لسهرة كاملة.",
    },
    {
      slug: "sample-pressed-powder",
      brand: "guerlain",
      tones: SAND,
      price: "62.00",
      rating: 4,
      published: false,
      nameEn: "Pressed Powder",
      nameAr: "بودرة مضغوطة",
      descriptionEn: "Blurs without a trace of powder.",
      descriptionAr: "تُنعّم البشرة دون أثر للبودرة.",
      reviewEn: "A true finishing touch.",
      reviewAr: "لمسة أخيرة حقيقية.",
    },
    {
      slug: "sample-renewal-cream",
      brand: "la-mer",
      tones: MOCHA,
      price: "210.00",
      rating: 4.5,
      published: true,
      featured: 3,
      stock: 6,
      nameEn: "Renewal Cream",
      nameAr: "كريم التجديد",
      descriptionEn: "Rich without weight.",
      descriptionAr: "غني دون ثقل.",
      reviewEn:
        "Rich without weight. My skin looked rested by the second week.\n\n1. Warm between fingertips\n2. Press, do not rub",
      reviewAr:
        "غني دون ثقل. بدت بشرتي مرتاحة منذ الأسبوع الثاني.\n\n1. دفّئيه بين أطراف الأصابع\n2. اضغطي ولا تفركي",
    },
    {
      slug: "sample-velvet-blush",
      brand: "chanel",
      tones: SAND,
      price: "58.00",
      rating: 4.5,
      published: true,
      featured: 4,
      nameEn: "Velvet Blush",
      nameAr: "أحمر خدود مخملي",
      descriptionEn: "A sheer wash of colour that melts into the skin.",
      descriptionAr: "لمسة لون شفافة تذوب في البشرة.",
      reviewEn:
        "The flush you get after a walk in the cold. Sheer at first, buildable to a proper glow.",
      reviewAr: "احمرار الخدّين بعد نزهة في البرد. شفاف في البداية، ويتدرّج إلى توهّج واضح.",
    },
    {
      slug: "sample-lip-glow-oil",
      brand: "dior",
      tones: MIST,
      price: "40.00",
      rating: 4,
      published: true,
      nameEn: "Lip Glow Oil",
      nameAr: "زيت لمعان الشفاه",
      descriptionEn: "A cushioning oil with a glassy shine.",
      descriptionAr: "زيت مريح بلمعان زجاجي.",
      reviewEn:
        "Shine without the stickiness. It does not last through lunch, but it is lovely to reapply.",
      reviewAr: "لمعان دون لزوجة. لا يصمد حتى الغداء، لكن إعادة وضعه متعة.",
    },
    {
      slug: "sample-royal-honey-serum",
      brand: "guerlain",
      tones: SAND,
      price: "120.00",
      rating: 5,
      published: true,
      nameEn: "Royal Honey Serum",
      nameAr: "سيروم العسل الملكي",
      descriptionEn: "A golden serum that plumps and smooths.",
      descriptionAr: "سيروم ذهبي يمنح الامتلاء والنعومة.",
      reviewEn:
        "The serum I finished and immediately bought again. Skin feels **bouncy** within days.",
      reviewAr: "السيروم الذي أنهيته واشتريته مجددًا فورًا. تشعرين بـ**مرونة** البشرة خلال أيام.",
    },
    {
      slug: "sample-soft-eye-balm",
      brand: "la-mer",
      tones: MIST,
      price: "95.00",
      rating: 3.5,
      published: true,
      nameEn: "Soft Eye Balm",
      nameAr: "بلسم العين الناعم",
      descriptionEn: "A cooling balm for tired eyes.",
      descriptionAr: "بلسم منعش للعيون المتعبة.",
      reviewEn:
        "Pleasant and cooling, but I expected more for the price. A good balm, not a miracle.",
      reviewAr: "منعش ولطيف، لكنني توقعت أكثر مقابل السعر. بلسم جيد، لا معجزة.",
    },
    {
      slug: "sample-silk-primer",
      brand: "charlotte-tilbury",
      tones: MOCHA,
      price: "52.00",
      rating: 4,
      published: true,
      stock: 0,
      nameEn: "Silk Primer",
      nameAr: "برايمر حريري",
      descriptionEn: "A blurring base that grips make-up all day.",
      descriptionAr: "قاعدة تُنعّم البشرة وتثبّت المكياج طوال اليوم.",
      reviewEn: "Foundation sat better on top of it than on anything else this year.",
      reviewAr: "ثبت كريم الأساس فوقه أفضل من أي برايمر جربته هذا العام.",
    },
    {
      slug: "sample-satin-bronzer",
      brand: "guerlain",
      tones: SAND,
      price: "70.00",
      rating: 4.5,
      published: true,
      nameEn: "Satin Bronzer",
      nameAr: "برونزر ساتان",
      descriptionEn: "Sun-kissed warmth without shimmer.",
      descriptionAr: "دفء الشمس دون لمعان.",
      reviewEn: "Warmth that looks like skin, not powder. The brush in the case is a bonus.",
      reviewAr: "دفء يبدو كالبشرة لا كالبودرة. الفرشاة داخل العلبة إضافة جميلة.",
    },
  ];

  const products: Product[] = [];
  for (const [index, p] of productData.entries()) {
    let product = await prisma.product.findUnique({ where: { slug: p.slug } });
    if (!product) {
      const brandName = brandData.find((b) => b.slug === p.brand)!.name;
      const cover = await placeholderImage(brandName.charAt(0), p.tones, "monogram");
      const still = await placeholderImage(brandName.charAt(0), p.tones, "still");
      product = await prisma.product.create({
        data: {
          slug: p.slug,
          nameEn: p.nameEn,
          nameAr: p.nameAr,
          descriptionEn: p.descriptionEn,
          descriptionAr: p.descriptionAr,
          reviewEn: p.reviewEn,
          reviewAr: p.reviewAr,
          rating: p.rating,
          price: p.price,
          currency: "USD",
          stock: p.stock ?? null,
          isPublished: p.published,
          isFeatured: p.featured !== undefined,
          featuredOrder: p.featured ?? null,
          brandId: brands[p.brand].id,
          // Spread over the past weeks so "newest" sorting has something to sort.
          createdAt: new Date(Date.now() - (index + 1) * 3 * 86_400_000),
          images: {
            create: [cover, still].map((asset, sortOrder) => ({
              assetId: asset.id,
              url: `${asset.dir}/w${Math.max(...asset.widths)}.webp`,
              sortOrder,
              altEn: `${p.nameEn} by ${brandName}${sortOrder ? ", still life" : ""}`,
              altAr: `${p.nameAr} من ${brandName}${sortOrder ? "، صورة جانبية" : ""}`,
            })),
          },
        },
      });
    }
    products.push(product);
  }

  type Sample = {
    key: string;
    status: OrderStatus;
    country: string;
    city: string;
    payment: PaymentMethod;
    locale: "en" | "ar";
    name: string;
    email: string;
    phone: string;
    whatsapp?: string;
    daysAgo: number;
    fee?: string;
    lines: Array<[number, number]>;
    tracking?: [string, string];
    cancelReason?: string;
    notes?: string;
  };
  const samples: Sample[] = [
    {
      key: "seed-order-1",
      status: "PENDING_REVIEW",
      country: "AE",
      city: "Dubai",
      payment: "CARD",
      locale: "en",
      name: "Layla Haddad",
      email: "layla.haddad@example.com",
      phone: "+971 50 000 0101",
      daysAgo: 0,
      lines: [
        [0, 2],
        [1, 1],
      ],
      notes: "Please gift wrap the lipsticks.",
    },
    {
      key: "seed-order-2",
      status: "AWAITING_PAYMENT",
      country: "KW",
      city: "Kuwait City",
      payment: "WHATSAPP",
      locale: "ar",
      name: "فاطمة الصباح",
      email: "fatima@example.com",
      phone: "+965 5000 0102",
      whatsapp: "+965 5000 0102",
      daysAgo: 1,
      fee: "12.00",
      lines: [[3, 1]],
    },
    {
      key: "seed-order-3",
      status: "APPROVED",
      country: "SA",
      city: "Riyadh",
      payment: "CASH_ON_DELIVERY",
      locale: "ar",
      name: "نورة القحطاني",
      email: "noura@example.com",
      phone: "+966 55 000 0103",
      daysAgo: 3,
      fee: "15.00",
      lines: [
        [0, 1],
        [3, 1],
      ],
    },
    {
      key: "seed-order-4",
      status: "SHIPPED",
      country: "GB",
      city: "London",
      payment: "CARD",
      locale: "en",
      name: "Amelia Clarke",
      email: "amelia.clarke@example.com",
      phone: "+44 7700 900104",
      daysAgo: 6,
      fee: "22.00",
      lines: [[1, 1]],
      tracking: ["DHL Express", "JD014600006104"],
    },
    {
      key: "seed-order-5",
      status: "DELIVERED",
      country: "QA",
      city: "Doha",
      payment: "CARD",
      locale: "en",
      name: "Hessa Al Mansoori",
      email: "hessa@example.com",
      phone: "+974 3300 0105",
      daysAgo: 9,
      fee: "14.00",
      lines: [[0, 3]],
      tracking: ["Aramex", "AX77010105"],
    },
    {
      key: "seed-order-6",
      status: "CANCELLED",
      country: "JO",
      city: "Amman",
      payment: "WHATSAPP",
      locale: "ar",
      name: "رانيا خوري",
      email: "rania.khoury@example.com",
      phone: "+962 79 000 0106",
      whatsapp: "+962 79 000 0106",
      daysAgo: 12,
      lines: [[2, 1]],
      cancelReason: "Customer asked to cancel before payment.",
    },
  ];

  const path: Record<OrderStatus, OrderStatus[]> = {
    PENDING_REVIEW: [],
    AWAITING_PAYMENT: ["AWAITING_PAYMENT"],
    APPROVED: ["APPROVED"],
    SHIPPED: ["AWAITING_PAYMENT", "APPROVED", "SHIPPED"],
    DELIVERED: ["AWAITING_PAYMENT", "APPROVED", "SHIPPED", "DELIVERED"],
    CANCELLED: ["CANCELLED"],
  };

  // Oldest first, so order numbers rise with dates.
  for (const s of [...samples].sort((a, b) => b.daysAgo - a.daysAgo)) {
    if (await prisma.order.findUnique({ where: { idempotencyKey: s.key } })) continue;
    const created = new Date(Date.now() - s.daysAgo * 86_400_000 - 3_600_000 * 5);
    const lines = s.lines.map(([index, quantity]) => ({ product: products[index], quantity }));
    const subtotal = fromCents(
      computeSubtotal(lines.map((l) => ({ unitPrice: l.product.price, quantity: l.quantity }))),
    );
    const total = s.fee ? fromCents(computeTotal(subtotal, s.fee)) : null;
    const approved = ["APPROVED", "SHIPPED", "DELIVERED", "AWAITING_PAYMENT"].includes(s.status);
    const paid = s.payment === "CARD" && ["SHIPPED", "DELIVERED"].includes(s.status);

    const steps = path[s.status];
    let previous: OrderStatus = "PENDING_REVIEW";
    const events = [
      {
        fromStatus: null,
        toStatus: "PENDING_REVIEW" as OrderStatus,
        note: "Order placed on the site.",
        createdAt: created,
      },
      ...steps.map((to, i) => {
        const event = {
          fromStatus: previous,
          toStatus: to,
          note:
            to === "CANCELLED"
              ? s.cancelReason
              : to === "SHIPPED" && s.tracking
                ? `Carrier: ${s.tracking[0]} · Tracking: ${s.tracking[1]}`
                : to === "AWAITING_PAYMENT"
                  ? "Approved. Waiting for the customer's payment."
                  : to === "APPROVED" && previous === "PENDING_REVIEW"
                    ? "Approved for cash on delivery."
                    : to === "APPROVED"
                      ? "Payment received."
                      : to === "DELIVERED"
                        ? "Delivered."
                        : null,
          createdAt: new Date(created.getTime() + (i + 1) * 86_400_000 * 0.8),
        };
        previous = to;
        return event;
      }),
    ];

    const [{ n }] = await prisma.$queryRaw<Array<{ n: bigint }>>`
      SELECT nextval('order_number_seq') AS n`;

    await prisma.order.create({
      data: {
        orderNumber: formatOrderNumber(created.getUTCFullYear(), n),
        publicToken: createPublicToken(),
        idempotencyKey: s.key,
        status: s.status,
        customerName: s.name,
        email: s.email,
        phone: s.phone,
        whatsapp: s.whatsapp,
        country: s.country,
        city: s.city,
        addressLine1: "Sample address, Building 1",
        postalCode: null,
        notes: s.notes,
        paymentMethod: s.payment,
        subtotal,
        shippingFee: s.fee ?? null,
        total,
        currency: "USD",
        locale: s.locale,
        approvedAt: approved ? new Date(created.getTime() + 86_400_000 * 0.8) : null,
        paidAt: paid ? new Date(created.getTime() + 86_400_000 * 1.6) : null,
        trackingNumber: s.tracking?.[1],
        carrier: s.tracking?.[0],
        cancelReason: s.cancelReason,
        createdAt: created,
        items: {
          create: lines.map((l) => ({
            productId: l.product.id,
            productNameSnapshot: l.product.nameEn,
            unitPrice: l.product.price,
            quantity: l.quantity,
          })),
        },
        events: { create: events },
      },
    });
  }
  console.log(
    `• Sample data ready: ${brandData.length} brands, ${productData.length} products, ${samples.length} orders.`,
  );
}

async function main() {
  await seedAdmin();
  if (process.env.SEED_SAMPLE_DATA === "true") await seedSamples();
  else console.log("• SEED_SAMPLE_DATA is not 'true': no sample data.");
}

main()
  .catch((error) => {
    console.error(error);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
