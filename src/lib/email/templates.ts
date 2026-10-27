import { escapeHtml } from "../review-markup";
import { absoluteUrl } from "../site-url";

/**
 * Order emails: table layout (email clients), the logo, sand hairlines and mocha type.
 * Customer emails are written in the order's language (Arabic is right-to-left); the owner's
 * notification is in English. Every dynamic value is escaped.
 */

export type EmailOrder = {
  locale: "en" | "ar";
  orderNumber: string;
  customerName: string;
  items: Array<{ name: string; quantity: number; lineTotal: string }>;
  subtotal: string;
  shippingFee: string | null;
  total: string | null;
  paymentMethod: "CASH_ON_DELIVERY" | "CARD" | "WHATSAPP";
  paymentUrl: string | null;
  carrier: string | null;
  trackingNumber: string | null;
  trackingUrl: string;
  shipTo: string;
};

export type Email = { subject: string; html: string; text: string };

const COLORS = {
  mocha: "#4a3f35",
  sand: "#b8a48f",
  sand100: "#f1ede9",
  sand200: "#dcd2c7",
  sand700: "#7c6c5e",
};

const copy = {
  en: {
    dir: "ltr",
    // Physical alignment: "text-align: end" is not understood by every email client.
    end: "right",
    hello: (name: string) => `Dear ${name},`,
    order: "Order",
    items: "Your order",
    subtotal: "Subtotal",
    shipping: "Shipping",
    shippingTbc: "To be confirmed",
    total: "Total",
    track: "Follow your order",
    payment: {
      CASH_ON_DELIVERY: "Cash on delivery",
      CARD: "Card (secure payment link)",
      WHATSAPP: "WhatsApp",
    },
    paymentLabel: "Payment",
    shipTo: "Shipping to",
    pay: "Pay securely",
    carrier: "Carrier",
    tracking: "Tracking number",
    signoff: "With care,<br>Zina's team",
    signoffText: "With care,\nZina's team",
    footer: "You are receiving this email because you placed an order on our website.",
    received: {
      subject: (n: string) => `We received your order ${n}`,
      lead: "Thank you for your order. Zina's team will confirm shipping to your country and your final total, usually within one working day. Nothing is charged before you have seen the final total.",
    },
    approved: {
      subject: (n: string) => `Your order ${n} is confirmed`,
      lead: "Good news: your order is confirmed. Here is your final total, including shipping.",
      payCard:
        "Use the secure link below to pay. We prepare your order as soon as payment arrives.",
      payCardLater: "Your secure payment link follows in a separate email shortly.",
      payWhatsapp: "Our team will contact you on WhatsApp to complete the payment.",
      payCod: "You pay in cash when your order arrives.",
    },
    paymentLink: {
      subject: (n: string) => `Your payment link for order ${n}`,
      lead: "Here is the secure link to pay for your order. We prepare it as soon as payment arrives.",
    },
    shipped: {
      subject: (n: string) => `Your order ${n} is on its way`,
      lead: "Your order has left us and is on its way to you.",
    },
  },
  ar: {
    dir: "rtl",
    end: "left",
    hello: (name: string) => `عزيزتي ${name}،`,
    order: "الطلب",
    items: "طلبك",
    subtotal: "المجموع الفرعي",
    shipping: "الشحن",
    shippingTbc: "يُؤكَّد لاحقًا",
    total: "الإجمالي",
    track: "تابعي طلبك",
    payment: {
      CASH_ON_DELIVERY: "الدفع عند الاستلام",
      CARD: "البطاقة (رابط دفع آمن)",
      WHATSAPP: "واتساب",
    },
    paymentLabel: "الدفع",
    shipTo: "الشحن إلى",
    pay: "ادفعي بأمان",
    carrier: "شركة الشحن",
    tracking: "رقم التتبّع",
    signoff: "مع خالص الود،<br>فريق زينة",
    signoffText: "مع خالص الود،\nفريق زينة",
    footer: "تصلكِ هذه الرسالة لأنكِ أرسلتِ طلبًا عبر موقعنا.",
    received: {
      subject: (n: string) => `استلمنا طلبك ${n}`,
      lead: "شكرًا لطلبك. سيؤكد فريق زينة الشحن إلى بلدك والمبلغ النهائي، عادةً خلال يوم عمل واحد. لا يُخصم أي مبلغ قبل أن تري الإجمالي النهائي.",
    },
    approved: {
      subject: (n: string) => `تم تأكيد طلبك ${n}`,
      lead: "خبر سعيد: تم تأكيد طلبك. إليكِ المبلغ النهائي شاملًا الشحن.",
      payCard: "استخدمي الرابط الآمن أدناه للدفع. نجهّز طلبك فور وصول الدفعة.",
      payCardLater: "يصلكِ رابط الدفع الآمن في رسالة منفصلة قريبًا.",
      payWhatsapp: "سيتواصل معكِ فريقنا عبر واتساب لإتمام الدفع.",
      payCod: "تدفعين نقدًا عند وصول طلبك.",
    },
    paymentLink: {
      subject: (n: string) => `رابط الدفع لطلبك ${n}`,
      lead: "إليكِ الرابط الآمن لدفع قيمة طلبك. نجهّزه فور وصول الدفعة.",
    },
    shipped: {
      subject: (n: string) => `طلبك ${n} في الطريق إليكِ`,
      lead: "غادر طلبك مستودعنا وهو في الطريق إليكِ.",
    },
  },
} as const;

function button(href: string, label: string) {
  return `<table role="presentation" cellpadding="0" cellspacing="0" border="0" style="margin:28px 0 8px"><tr><td style="background:${COLORS.mocha};border-radius:999px"><a href="${escapeHtml(href)}" style="display:inline-block;padding:14px 32px;color:#ffffff;text-decoration:none;font-family:Helvetica,Arial,sans-serif;font-size:14px;letter-spacing:0.04em">${escapeHtml(label)}</a></td></tr></table>`;
}

function row(label: string, value: string, end: string, strong = false) {
  return `<tr><td style="padding:6px 0;color:${COLORS.sand700};font-size:14px">${escapeHtml(label)}</td><td align="${end}" style="padding:6px 0;text-align:${end};color:${COLORS.mocha};font-size:${strong ? "18px" : "14px"};${strong ? "font-family:Georgia,serif;" : ""}">${escapeHtml(value)}</td></tr>`;
}

/**
 * The horizontal Maison lockup as a PNG (scripts/brand/build-identity.mjs): email clients do not
 * render SVG. When images are blocked, the alt text is styled as the old wordmark.
 */
function logo() {
  return `<img src="${escapeHtml(absoluteUrl("/brand/email-logo.png"))}" width="200" height="39" alt="Zina Al Mokri" style="display:block;border:0;outline:none;width:200px;height:auto;font-family:Georgia,'Times New Roman',serif;font-size:18px;letter-spacing:0.34em;color:${COLORS.mocha};text-transform:uppercase">`;
}

function layout(dir: string, lang: string, preheader: string, body: string) {
  return `<!doctype html>
<html lang="${lang}" dir="${dir}">
<head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><meta name="color-scheme" content="light"><title>Zina Al Mokri</title></head>
<body style="margin:0;padding:0;background:${COLORS.sand100}">
<span style="display:none;max-height:0;overflow:hidden;opacity:0">${escapeHtml(preheader)}</span>
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="background:${COLORS.sand100}"><tr><td align="center" style="padding:32px 12px">
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" dir="${dir}" style="max-width:600px;background:#ffffff;border:1px solid ${COLORS.sand200}">
<tr><td align="center" style="padding:36px 32px 28px;border-bottom:1px solid ${COLORS.sand200}">${logo()}</td></tr>
<tr><td style="padding:32px;font-family:Helvetica,Arial,sans-serif;color:${COLORS.mocha};font-size:15px;line-height:1.7" align="${dir === "rtl" ? "right" : "left"}">${body}</td></tr>
</table>
</td></tr></table>
</body></html>`;
}

function summary(order: EmailOrder, c: (typeof copy)["en" | "ar"]) {
  const items = order.items
    .map(
      (item) =>
        `<tr><td style="padding:10px 0;border-bottom:1px solid ${COLORS.sand200};font-size:15px">${escapeHtml(item.name)} <span style="color:${COLORS.sand700}">× ${item.quantity}</span></td><td align="${c.end}" style="padding:10px 0;border-bottom:1px solid ${COLORS.sand200};text-align:${c.end};font-size:15px;white-space:nowrap">${escapeHtml(item.lineTotal)}</td></tr>`,
    )
    .join("");
  return `<p style="margin:28px 0 8px;font-size:11px;letter-spacing:0.24em;text-transform:uppercase;color:${COLORS.sand700}">${escapeHtml(c.items)} · <span dir="ltr">${escapeHtml(order.orderNumber)}</span></p>
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0">${items}</table>
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="margin-top:12px">
${row(c.subtotal, order.subtotal, c.end)}
${row(c.shipping, order.shippingFee ?? c.shippingTbc, c.end)}
${order.total ? row(c.total, order.total, c.end, true) : ""}
${row(c.paymentLabel, c.payment[order.paymentMethod], c.end)}
${row(c.shipTo, order.shipTo, c.end)}
</table>`;
}

function closing(c: (typeof copy)["en" | "ar"], order: EmailOrder) {
  return `${button(order.trackingUrl, c.track)}
<p style="margin:28px 0 0">${c.signoff}</p>
<p style="margin:28px 0 0;padding-top:20px;border-top:1px solid ${COLORS.sand200};font-size:12px;color:${COLORS.sand700}">${escapeHtml(c.footer)}</p>`;
}

function textSummary(order: EmailOrder, c: (typeof copy)["en" | "ar"]) {
  return [
    `${c.order} ${order.orderNumber}`,
    ...order.items.map((item) => `- ${item.name} × ${item.quantity}: ${item.lineTotal}`),
    `${c.subtotal}: ${order.subtotal}`,
    `${c.shipping}: ${order.shippingFee ?? c.shippingTbc}`,
    ...(order.total ? [`${c.total}: ${order.total}`] : []),
    `${c.paymentLabel}: ${c.payment[order.paymentMethod]}`,
    `${c.track}: ${order.trackingUrl}`,
  ].join("\n");
}

function customerEmail(
  order: EmailOrder,
  subject: string,
  lead: string,
  extraHtml = "",
  extraText = "",
): Email {
  const c = copy[order.locale];
  const html = layout(
    c.dir,
    order.locale,
    lead,
    `<p style="margin:0 0 16px">${escapeHtml(c.hello(order.customerName))}</p>
<p style="margin:0">${escapeHtml(lead)}</p>
${extraHtml}
${summary(order, c)}
${closing(c, order)}`,
  );
  const text = [
    c.hello(order.customerName),
    "",
    lead,
    extraText,
    "",
    textSummary(order, c),
    "",
    c.signoffText,
  ]
    .filter((line, i, all) => !(line === "" && all[i - 1] === ""))
    .join("\n");
  return { subject, html, text };
}

export function orderReceivedEmail(order: EmailOrder): Email {
  const c = copy[order.locale];
  return customerEmail(order, c.received.subject(order.orderNumber), c.received.lead);
}

export function orderApprovedEmail(order: EmailOrder): Email {
  const c = copy[order.locale];
  const payNote =
    order.paymentMethod === "CARD"
      ? order.paymentUrl
        ? c.approved.payCard
        : c.approved.payCardLater
      : order.paymentMethod === "WHATSAPP"
        ? c.approved.payWhatsapp
        : c.approved.payCod;
  const payButton =
    order.paymentMethod === "CARD" && order.paymentUrl ? button(order.paymentUrl, c.pay) : "";
  return customerEmail(
    order,
    c.approved.subject(order.orderNumber),
    c.approved.lead,
    `<p style="margin:16px 0 0">${escapeHtml(payNote)}</p>${payButton}`,
    [
      payNote,
      order.paymentMethod === "CARD" && order.paymentUrl ? `${c.pay}: ${order.paymentUrl}` : "",
    ]
      .filter(Boolean)
      .join("\n"),
  );
}

export function paymentLinkEmail(order: EmailOrder): Email {
  const c = copy[order.locale];
  if (!order.paymentUrl) throw new Error("paymentLinkEmail needs a payment URL");
  return customerEmail(
    order,
    c.paymentLink.subject(order.orderNumber),
    c.paymentLink.lead,
    button(order.paymentUrl, c.pay),
    `${c.pay}: ${order.paymentUrl}`,
  );
}

export function orderShippedEmail(order: EmailOrder): Email {
  const c = copy[order.locale];
  const shipment = [
    order.carrier ? row(c.carrier, order.carrier, c.end) : "",
    order.trackingNumber ? row(c.tracking, order.trackingNumber, c.end) : "",
  ].join("");
  return customerEmail(
    order,
    c.shipped.subject(order.orderNumber),
    c.shipped.lead,
    shipment
      ? `<table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="margin-top:16px">${shipment}</table>`
      : "",
    [
      order.carrier ? `${c.carrier}: ${order.carrier}` : "",
      order.trackingNumber ? `${c.tracking}: ${order.trackingNumber}` : "",
    ]
      .filter(Boolean)
      .join("\n"),
  );
}

/** To ORDER_NOTIFY_EMAIL: a new order to review, with a link to it in the admin. */
export function ownerNewOrderEmail(order: EmailOrder, adminUrl: string): Email {
  const c = copy.en;
  const subject = `New order ${order.orderNumber} · ${order.customerName}`;
  const html = layout(
    "ltr",
    "en",
    `New order to review: ${order.orderNumber}`,
    `<p style="margin:0">A new order is waiting for review. Set the shipping fee, then approve it.</p>
${summary({ ...order, locale: "en" }, c)}
${button(adminUrl, "Open in admin")}`,
  );
  const text = [
    `A new order is waiting for review: ${order.orderNumber}`,
    "",
    textSummary({ ...order, locale: "en" }, c),
    "",
    `Open in admin: ${adminUrl}`,
  ].join("\n");
  return { subject, html, text };
}
