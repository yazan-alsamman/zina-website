import { describe, expect, it } from "vitest";
import {
  checkLoginRateLimit,
  recordLoginFailure,
  resetLoginRateLimit,
} from "@/lib/auth/rate-limit";

describe("login rate limit", () => {
  it("blocks an IP + email after 5 failures, for 15 minutes", () => {
    const t0 = 1_000_000;
    const ip = "203.0.113.7";
    for (let i = 0; i < 5; i++) {
      expect(checkLoginRateLimit(ip, "a@example.com", t0).allowed).toBe(true);
      recordLoginFailure(ip, "a@example.com", t0);
    }
    const blocked = checkLoginRateLimit(ip, "A@example.com", t0 + 1000);
    expect(blocked.allowed).toBe(false);
    expect(blocked.retryAfterMs).toBeGreaterThan(14 * 60 * 1000);
    expect(checkLoginRateLimit(ip, "a@example.com", t0 + 15 * 60 * 1000 + 1).allowed).toBe(true);
  });

  it("only counts failures, and a success clears the account counter", () => {
    const ip = "203.0.113.8";
    for (let i = 0; i < 4; i++) recordLoginFailure(ip, "b@example.com");
    resetLoginRateLimit(ip, "b@example.com");
    recordLoginFailure(ip, "b@example.com");
    expect(checkLoginRateLimit(ip, "b@example.com").allowed).toBe(true);
  });

  it("caps failures per IP across many emails", () => {
    const ip = "203.0.113.9";
    for (let i = 0; i < 20; i++) recordLoginFailure(ip, `user${i}@example.com`);
    expect(checkLoginRateLimit(ip, "fresh@example.com").allowed).toBe(false);
  });
});
