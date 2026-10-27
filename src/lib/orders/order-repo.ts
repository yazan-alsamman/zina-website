import "server-only";
import { Prisma } from "@/generated/prisma/client";
import { prisma } from "../prisma";
import { formatOrderNumber } from "./number";
import { DuplicateOrderError, type OrderRepo, type PlacedOrder } from "./place-order";
import { createPublicToken } from "./token";

const placedSelect = { id: true, orderNumber: true, publicToken: true, locale: true } as const;

export const prismaOrderRepo: OrderRepo = {
  findByIdempotencyKey: (key) =>
    prisma.order.findUnique({ where: { idempotencyKey: key }, select: placedSelect }),

  findProducts: (ids) =>
    prisma.product.findMany({
      where: { id: { in: ids } },
      select: {
        id: true,
        nameEn: true,
        nameAr: true,
        price: true,
        currency: true,
        stock: true,
        isPublished: true,
      },
    }),

  async createOrder(order): Promise<PlacedOrder> {
    try {
      return await prisma.$transaction(async (tx) => {
        const [{ n }] = await tx.$queryRaw<Array<{ n: bigint }>>`
          SELECT nextval('order_number_seq') AS n`;
        const now = new Date();
        return tx.order.create({
          select: placedSelect,
          data: {
            orderNumber: formatOrderNumber(now.getUTCFullYear(), n),
            publicToken: createPublicToken(),
            idempotencyKey: order.idempotencyKey,
            status: "PENDING_REVIEW",
            locale: order.locale,
            customerName: order.customer.name,
            email: order.customer.email,
            phone: order.customer.phone,
            whatsapp: order.customer.whatsapp,
            country: order.customer.country,
            city: order.customer.city,
            addressLine1: order.customer.addressLine1,
            addressLine2: order.customer.addressLine2,
            postalCode: order.customer.postalCode,
            notes: order.customer.notes,
            paymentMethod: order.customer.paymentMethod,
            subtotal: order.subtotal,
            currency: order.currency,
            createdAt: now,
            items: {
              create: order.items.map((item) => ({
                productId: item.productId,
                productNameSnapshot: item.name,
                unitPrice: item.unitPrice,
                quantity: item.quantity,
              })),
            },
            events: {
              create: {
                fromStatus: null,
                toStatus: "PENDING_REVIEW",
                note: "Order placed on the site.",
                createdAt: now,
              },
            },
          },
        });
      });
    } catch (error) {
      // Unique violation. placeOrder() re-reads by idempotency key and only treats it as a
      // duplicate submit if that key now exists; anything else is rethrown from there.
      if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2002") {
        throw new DuplicateOrderError();
      }
      throw error;
    }
  },
};
