import assert from "node:assert/strict";
import {
  createOrderWithDependencies,
  type CreateOrderDependencies,
  type CreateOrderInput,
} from "../src/actions/create-order";

const input: CreateOrderInput = {
  file: { url: "https://files.example/model.gcode", name: "model.gcode", size: 10 },
  materialKey: "pla",
  qualityKey: "normal",
  quantity: 2,
  printSettings: { infill: "20%", color: "White" },
  shipping: { recipientName: "Customer", phone: "0812", address: "Sleman" },
  totals: { printCost: 10000, shippingCost: 5000, serviceFee: 1000, grandTotal: 16000 },
  printerId: "printer-best",
  providerId: "provider-from-browser",
  customerCoords: { lat: -7.75, lng: 110.4 },
  dueDate: "2026-07-22",
  modelDimensions: { width: 10, height: 20, depth: 30 },
  gcodeData: { estimatedTime: 61, filamentWeight: 4 },
};

function dependencies() {
  const calls = { order: 0, payment: 0, snap: 0 };
  let capturedOrder: Record<string, unknown> | null = null;
  let capturedMatch: Record<string, unknown> | null = null;
  const deps: CreateOrderDependencies = {
    findMaterial: async () => ({ id: "pla" }),
    findQuality: async () => ({ id: "normal" }),
    matchPrinter: async (order) => {
      capturedMatch = order as unknown as Record<string, unknown>;
      return {
        success: true,
        availablePrinters: 1,
        alternatives: [],
        bestPrinter: {
          printerId: "printer-best",
          providerId: "provider-authoritative",
          printerName: "Printer",
          providerName: "Provider",
          providerCity: "Sleman",
          providerProvince: "DIY",
          coordinates: { lat: -7.75, lng: 110.4 },
          isVerified: true,
          status: "ONLINE",
          isAcceptingOrders: true,
          queuedOrders: 0,
          score: 100,
          canPrintImmediately: true,
          breakdown: {
            distanceKm: 0, waitMinutes: 0, jobsAhead: 0,
            projectedMinutesAfter: 4, projectedJobsAfter: 1,
            distanceScore: 100, queueDurationScore: 100,
            queueCountScore: 100, loadedMaterialScore: 100,
            materialMatch: true, queueTimeScore: 100,
            queueTimeMinutes: 0, materialMatchScore: 100,
          },
        },
      };
    },
    createOrder: async (data) => {
      calls.order += 1;
      capturedOrder = data as unknown as Record<string, unknown>;
      return { id: "order-1", orderNumber: String(data.orderNumber) };
    },
    createSnapTransaction: async () => {
      calls.snap += 1;
      return { token: "snap-token", redirect_url: "https://snap.example" };
    },
    createPayment: async () => {
      calls.payment += 1;
    },
    now: () => new Date("2026-07-19T00:00:00.000Z"),
    randomSuffix: () => "1234",
  };
  return { deps, calls, getOrder: () => capturedOrder, getMatch: () => capturedMatch };
}

async function main() {
  const successful = dependencies();
  const result = await createOrderWithDependencies(
    input,
    { userId: "user-1", email: "customer@example.com", name: "Customer" },
    successful.deps
  );
  assert.equal(result.success, true);
  assert.equal(successful.calls.order, 1);
  assert.equal(successful.calls.payment, 1);
  assert.equal(successful.calls.snap, 1);
  assert.equal(successful.getMatch()?.estimatedPrintTime, 2);
  assert.equal(successful.getMatch()?.quantity, 2);
  assert.equal((successful.getMatch()?.dueDate as Date).toISOString(), "2026-07-22T16:59:59.999Z");
  assert.equal(successful.getOrder()?.estimatedPrintTime, 2);
  assert.equal((successful.getOrder()?.dueDate as Date).toISOString(), "2026-07-22T16:59:59.999Z");
  assert.equal(successful.getOrder()?.providerId, "provider-authoritative");
  assert.equal(successful.getOrder()?.printerId, "printer-best");

  const mismatch = dependencies();
  const mismatchResult = await createOrderWithDependencies(
    { ...input, printerId: "stale-browser-selection" },
    { userId: "user-1", email: "customer@example.com", name: "Customer" },
    mismatch.deps
  );
  assert.equal(mismatchResult.success, false);
  assert.deepEqual(mismatch.calls, { order: 0, payment: 0, snap: 0 });

  const unavailable = dependencies();
  unavailable.deps.matchPrinter = async () => ({
    success: false,
    code: "NO_AVAILABLE_PRINTER",
    error: "Tidak ada printer online yang tersedia",
    rejectionSummary: { OFFLINE: 1 },
  });
  const unavailableResult = await createOrderWithDependencies(
    input,
    { userId: "user-1", email: "customer@example.com", name: "Customer" },
    unavailable.deps
  );
  assert.equal(unavailableResult.success, false);
  assert.deepEqual(unavailable.calls, { order: 0, payment: 0, snap: 0 });

  console.log("create-order-orchestration tests passed");
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
