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

/** Placeholder product photo: tonal gradient with a serif monogram, through the real pipeline. */
async function placeholderImage(letter: string, tones: [string, string, string]) {
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="1600" height="2000">
    <defs>
      <radialGradient id="g" cx="30%" cy="22%" r="95%">
        <stop offset="0" stop-color="${tones[0]}"/><stop offset="0.55" stop-color="${tones[1]}"/><stop offset="1" stop-color="${tones[2]}"/>
      </radialGradient>
    </defs>
    <rect width="1600" height="2000" fill="url(#g)"/>
    <text x="800" y="1220" font-family="Georgia, serif" font-size="760" fill="#ffffff" fill-opacity="0.28" text-anchor="middle">${letter}</text>
  </svg>`;
  const jpeg = await sharp(Buffer.from(svg)).jpeg({ quality: 90 }).toBuffer();
  const processed = await processImage(jpeg, "image/jpeg");
  return prisma.mediaAsset.create({ data: processed });
}

const SAND: [string, string, string] = ["#f1ede9", "#b8a48f", "#7c6c5e"];
const MOCHA: [string, string, string] = ["#7c6c5e", "#4a3f35", "#211c18"];
const MIST: [string, string, string] = ["#ffffff", "#eaeaea", "#b8a48f"];

async function seedSamples() {
  const brandData = [
    { name: "Dior", slug: "dior", website: "https://www.dior.com" },
    { name: "Chanel", slug: "chanel", website: "https://www.chanel.com" },
    { name: "Guerlain", slug: "guerlain", website: "https://www.guerlain.com" },
    { name: "La Mer", slug: "la-mer", website: "https://www.cremedelamer.com" },
  ];
  const brands = Object.fromEntries(
    await Promise.all(
      brandData.map(async (b) => [
        b.slug,
        await prisma.brand.upsert({ where: { slug: b.slug }, update: {}, create: b }),
      ]),
    ),
  );

  const productData = [
    {
      slug: "sample-satin-lipstick",
      brand: "dior",
      letter: "D",
      tones: SAND,
      price: "48.00",
      rating: 4.5,
      published: true,
      nameEn: "Satin Lipstick",
      nameAr: "أحمر شفاه ساتان",
      descriptionEn: "A creamy satin finish with a soft, comfortable feel.",
      descriptionAr: "لمسة ساتان كريمية بإحساس ناعم ومريح.",
      reviewEn:
        "Glides on like balm and **wears like a stain**.\n\n- Comfortable all day\n- Buildable colour",
      reviewAr: "ينزلق كالبلسم و**يثبت كالصبغة**.\n\n- مريح طوال اليوم\n- لون قابل للتدرج",
    },
    {
      slug: "sample-eau-de-parfum",
      brand: "chanel",
      letter: "C",
      tones: MIST,
      price: "165.00",
      rating: 5,
      published: true,
      nameEn: "Eau de Parfum",
      nameAr: "ماء العطر",
      descriptionEn: "Soft iris and warm musk.",
      descriptionAr: "سوسن ناعم ومسك دافئ.",
      reviewEn: "Quiet, never shy. **Lasts eight hours** on my skin.",
      reviewAr: "هادئ لكنه حاضر. **يدوم ثماني ساعات** على بشرتي.",
    },
    {
      slug: "sample-pressed-powder",
      brand: "guerlain",
      letter: "G",
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
      letter: "L",
      tones: MOCHA,
      price: "210.00",
      rating: 4.5,
      published: true,
      nameEn: "Renewal Cream",
      nameAr: "كريم التجديد",
      descriptionEn: "Rich without weight.",
      descriptionAr: "غني دون ثقل.",
      reviewEn: "1. Warm between fingertips\n2. Press, do not rub",
      reviewAr: "1. دفّئيه بين أطراف الأصابع\n2. اضغطي ولا تفركي",
    },
  ];

  const products: Product[] = [];
  for (const p of productData) {
    let product = await prisma.product.findUnique({ where: { slug: p.slug } });
    if (!product) {
      const asset = await placeholderImage(p.letter, p.tones);
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
          isPublished: p.published,
          brandId: brands[p.brand].id,
          images: {
            create: {
              assetId: asset.id,
              url: `${asset.dir}/w${Math.max(...asset.widths)}.webp`,
              sortOrder: 0,
              altEn: `${p.nameEn} by ${brandData.find((b) => b.slug === p.brand)!.name}`,
              altAr: p.nameAr,
            },
          },
        },
      });
    }
    products.push(product);
  }

  type Sample = {
    number: string;
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
      number: "ZM-2026-00101",
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
      number: "ZM-2026-00102",
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
      number: "ZM-2026-00103",
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
      number: "ZM-2026-00104",
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
      number: "ZM-2026-00105",
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
      number: "ZM-2026-00106",
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

  for (const s of samples) {
    if (await prisma.order.findUnique({ where: { orderNumber: s.number } })) continue;
    const created = new Date(Date.now() - s.daysAgo * 86_400_000 - 3_600_000 * 5);
    const lines = s.lines.map(([index, quantity]) => ({ product: products[index], quantity }));
    const subtotal = fromCents(
      computeSubtotal(lines.map((l) => ({ unitPrice: l.product.price, quantity: l.quantity }))),
    );
    const total = s.fee ? fromCents(computeTotal(subtotal, s.fee)) : null;
    const approved = ["APPROVED", "SHIPPED", "DELIVERED", "AWAITING_PAYMENT"].includes(s.status);

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

    await prisma.order.create({
      data: {
        orderNumber: s.number,
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
        trackingNumber: s.tracking?.[1],
        carrier: s.tracking?.[0],
        cancelReason: s.cancelReason,
        createdAt: created,
        items: {
          create: lines.map((l) => ({
            productId: l.product.id,
            productNameSnapshot: `${l.product.nameEn}`,
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
