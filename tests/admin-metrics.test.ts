import assert from "node:assert/strict";
import {
  formatAdminCurrency,
  formatAdminDate,
  getPrinterHealthLabel,
  maskBankAccount,
} from "../src/lib/admin-metrics";

assert.equal(formatAdminCurrency(0), "Rp 0");
assert.equal(formatAdminCurrency(1250000), "Rp 1.250.000");
assert.equal(formatAdminCurrency("98500.50"), "Rp 98.501");

assert.equal(maskBankAccount(null), "Belum diisi");
assert.equal(maskBankAccount("1234567890"), "•••• ••7890");
assert.equal(maskBankAccount("123"), "•••");

assert.equal(getPrinterHealthLabel("ERROR", null), "Error");
assert.equal(getPrinterHealthLabel("OFFLINE", null), "Offline");
assert.equal(getPrinterHealthLabel("ONLINE", new Date().toISOString()), "Online");
assert.equal(
  getPrinterHealthLabel("ONLINE", new Date(Date.now() - 10 * 60 * 1000).toISOString()),
  "Stale"
);

assert.equal(formatAdminDate(new Date("2026-07-12T08:15:00.000Z")), "12 Jul 2026");

console.log("admin-metrics tests passed");
