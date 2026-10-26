import { describe, expect, it } from "vitest";
import {
  approvalTarget,
  assertTransition,
  canTransition,
  ORDER_STATUSES,
  planApproval,
  TransitionError,
  whatsappLink,
  whatsappMessage,
} from "@/lib/orders/workflow";

describe("order status workflow", () => {
  it("allows the documented happy paths", () => {
    expect(canTransition("PENDING_REVIEW", "AWAITING_PAYMENT")).toBe(true);
    expect(canTransition("PENDING_REVIEW", "APPROVED")).toBe(true);
    expect(canTransition("AWAITING_PAYMENT", "APPROVED")).toBe(true);
    expect(canTransition("APPROVED", "SHIPPED")).toBe(true);
    expect(canTransition("SHIPPED", "DELIVERED")).toBe(true);
  });

  it("rejects illegal transitions", () => {
    expect(() => assertTransition("PENDING_REVIEW", "SHIPPED")).toThrow(TransitionError);
    expect(() => assertTransition("AWAITING_PAYMENT", "SHIPPED")).toThrow(TransitionError);
    expect(() => assertTransition("SHIPPED", "CANCELLED")).toThrow(TransitionError);
    expect(() => assertTransition("DELIVERED", "PENDING_REVIEW")).toThrow(TransitionError);
  });

  it("treats delivered and cancelled as final", () => {
    for (const to of ORDER_STATUSES) {
      expect(canTransition("DELIVERED", to)).toBe(false);
      expect(canTransition("CANCELLED", to)).toBe(false);
    }
  });

  it("routes approval by payment method", () => {
    expect(approvalTarget("CASH_ON_DELIVERY")).toBe("APPROVED");
    expect(approvalTarget("CARD")).toBe("AWAITING_PAYMENT");
    expect(approvalTarget("WHATSAPP")).toBe("AWAITING_PAYMENT");
  });

  it("requires a shipping fee and a pending order to approve", () => {
    expect(() =>
      planApproval({ status: "PENDING_REVIEW", paymentMethod: "CARD", shippingFee: null }),
    ).toThrow(/shipping fee/i);
    expect(() =>
      planApproval({ status: "APPROVED", paymentMethod: "CARD", shippingFee: "10.00" }),
    ).toThrow(TransitionError);
    expect(
      planApproval({ status: "PENDING_REVIEW", paymentMethod: "CARD", shippingFee: "0.00" }),
    ).toBe("AWAITING_PAYMENT");
  });

  it("builds a localized wa.me link with the final total", () => {
    const base = {
      orderNumber: "ZM-2026-00042",
      customerName: "Layla Haddad",
      total: "239.75",
      currency: "USD",
      paymentMethod: "CARD" as const,
    };
    const en = whatsappMessage({ ...base, locale: "en" });
    expect(en).toContain("ZM-2026-00042");
    expect(en).toContain("$239.75");
    const ar = whatsappMessage({ ...base, locale: "ar" });
    expect(ar).toContain("مرحبًا");
    const link = whatsappLink("+971 50 123 4567", en);
    expect(link).toMatch(/^https:\/\/wa\.me\/971501234567\?text=/);
    expect(whatsappLink("12", en)).toBeNull();
  });
});
