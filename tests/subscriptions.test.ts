import { test } from "node:test";
import assert from "node:assert/strict";
import {
  cleanSubscription, daysUntil, monthlyCost, parseEmail, rowToSubscription, senderDomain, serviceNameFromSender, statusAfterSignal,
} from "../app/api/subscriptions/payload.ts";

test("parseEmail extracts a monthly receipt with renewal date and cancel link", () => {
  const signal = parseEmail({
    id: "msg-1",
    from: '"Notion Team" <billing@mail.notion.so>',
    subject: "Your Notion receipt",
    date: "2026-09-01T10:00:00Z",
    body: "Thanks for your payment of $10.00 for the Plus plan. Your subscription renews on October 1, 2026 and is billed monthly. " +
      "Manage or cancel anytime: https://www.notion.so/my-account/billing?cancel=1 Terms: https://notion.so/terms",
  });
  assert.equal(signal.kind, "receipt");
  assert.equal(signal.serviceName, "Notion");
  assert.equal(signal.senderDomain, "notion.so");
  assert.equal(signal.category, "Productivity");
  assert.equal(signal.planName, "Plus");
  assert.equal(signal.amountCents, 1000);
  assert.equal(signal.currency, "USD");
  assert.equal(signal.billingInterval, "monthly");
  assert.equal(signal.renewalDate, "2026-10-01");
  assert.equal(signal.trialEndDate, null);
  assert.equal(signal.cancelUrl, "https://www.notion.so/my-account/billing?cancel=1");
  assert.equal(signal.confidence, 100);
  assert.equal(signal.messageHash.length, 8);
});

test("parseEmail detects trial warnings with relative dates and yearly pricing", () => {
  const signal = parseEmail({
    from: "Figma <no-reply@figma.com>",
    subject: "Your free trial ends in 3 days",
    date: "2026-09-10T00:00:00Z",
    snippet: "After your trial ends you'll be charged €144.00 per year for the Professional plan.",
  });
  assert.equal(signal.kind, "trial");
  assert.equal(signal.serviceName, "Figma");
  assert.equal(signal.trialEndDate, "2026-09-13");
  assert.equal(signal.amountCents, 14400);
  assert.equal(signal.currency, "EUR");
  assert.equal(signal.billingInterval, "yearly");
  assert.equal(signal.category, "Design");
});

test("parseEmail classifies cancellations and unknown mail, never echoing the body", () => {
  const cancel = parseEmail({ from: "Spotify <no-reply@spotify.com>", subject: "Your subscription has been canceled", body: "SECRET BODY TEXT" });
  assert.equal(cancel.kind, "cancellation");
  assert.equal(statusAfterSignal(cancel.kind), "canceled");
  assert.ok(!JSON.stringify(cancel).includes("SECRET BODY TEXT"));

  const noise = parseEmail({ from: "Mom <mom@example.com>", subject: "Dinner on Sunday?", body: "Bring the salad." });
  assert.equal(noise.kind, "unknown");
  assert.equal(noise.serviceName, "Mom");
  assert.ok(noise.confidence < 45);
});

test("parseEmail hashes are stable per message id and differ across messages", () => {
  const a = parseEmail({ id: "x", from: "a@a.com", subject: "Receipt" });
  const b = parseEmail({ id: "x", from: "a@a.com", subject: "Receipt (resent)" });
  const c = parseEmail({ id: "y", from: "a@a.com", subject: "Receipt" });
  assert.equal(a.messageHash, b.messageHash);
  assert.notEqual(a.messageHash, c.messageHash);
});

test("sender helpers strip generic words and fall back to the domain label", () => {
  assert.equal(serviceNameFromSender('"Raycast Billing" <receipts@raycast.com>'), "Raycast");
  assert.equal(serviceNameFromSender("<noreply@mail.vercel.com>"), "Vercel");
  assert.equal(senderDomain("x <billing@eu.mail.openai.com>"), "openai.com");
  assert.equal(senderDomain("garbage"), null);
});

test("cleanSubscription validates and normalizes; rowToSubscription maps cents and defaults", () => {
  assert.throws(() => cleanSubscription({ serviceName: " " }), /Service name is required/);
  assert.throws(() => cleanSubscription({ serviceName: "X", cost: -1 }), /non-negative/);
  const cleaned = cleanSubscription({ serviceName: " Linear ", cost: 8.5, billingInterval: "bogus", status: "nope", cancelUrl: "javascript:alert(1)", currency: "usd" });
  assert.equal(cleaned.costCents, 850);
  assert.equal(cleaned.billingInterval, "monthly");
  assert.equal(cleaned.status, "active");
  assert.equal(cleaned.cancelUrl, null);
  assert.equal(cleaned.currency, "USD");
  const sub = rowToSubscription({ id: "s1", service_name: "Linear", cost_cents: 850, billing_interval: "yearly", status: "trialing", signal_count: "2" });
  assert.equal(sub.cost, 8.5);
  assert.equal(sub.billingInterval, "yearly");
  assert.equal(sub.status, "trialing");
  assert.equal(sub.signalCount, 2);
});

test("monthlyCost normalizes intervals and daysUntil counts calendar days", () => {
  assert.equal(monthlyCost(120, "yearly"), 10);
  assert.equal(monthlyCost(30, "quarterly"), 10);
  assert.equal(monthlyCost(99, "one_time"), 0);
  assert.equal(daysUntil("2026-09-15", new Date("2026-09-10T23:00:00Z")), 5);
  assert.equal(daysUntil(null), null);
});

test("parseEmail treats a future charge notice as a renewal and reads the date after the amount", () => {
  const signal = parseEmail({ from: "Notion <billing@mail.notion.so>", subject: "Your Notion subscription renews soon", body: "Your subscription will be charged $12.00 on November 1, 2026. Billed monthly." });
  assert.equal(signal.kind, "renewal");
  assert.equal(signal.renewalDate, "2026-11-01");
  assert.equal(signal.amountCents, 1200);
});
