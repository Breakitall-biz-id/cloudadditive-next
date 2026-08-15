import assert from "node:assert/strict";
import {
  canEnterPaymentStep,
  canSubmitPayment,
  shouldAutoStartSlicing,
} from "../src/lib/order-checkout-state";

async function main() {
  const readySlice = {
    filePresent: true,
    isGcode: false,
    selectedMaterial: "abs",
    selectedQuality: "draft",
    hasSlicedResult: false,
    isSlicing: false,
    hasSlicingError: false,
    currentAttemptKey: "file:abs:draft",
    lastAttemptKey: null,
  };

  assert.equal(shouldAutoStartSlicing(readySlice), true);
  assert.equal(shouldAutoStartSlicing({ ...readySlice, isSlicing: true }), false);
  assert.equal(shouldAutoStartSlicing({ ...readySlice, hasSlicingError: true, lastAttemptKey: "file:abs:draft" }), false);
  assert.equal(shouldAutoStartSlicing({ ...readySlice, hasSlicingError: true, lastAttemptKey: "file:pla:draft" }), true);
  assert.equal(shouldAutoStartSlicing({ ...readySlice, selectedMaterial: null }), false);
  assert.equal(shouldAutoStartSlicing({ ...readySlice, isGcode: true, selectedMaterial: null, selectedQuality: null }), true);

  assert.equal(canEnterPaymentStep({ hasSlicedResult: true, isSlicing: false, hasSlicingError: false }), true);
  assert.equal(canEnterPaymentStep({ hasSlicedResult: false, isSlicing: true, hasSlicingError: false }), false);
  assert.equal(canEnterPaymentStep({ hasSlicedResult: false, isSlicing: false, hasSlicingError: true }), false);
  assert.equal(canEnterPaymentStep({ hasSlicedResult: false, isSlicing: false, hasSlicingError: false }), false);

  assert.equal(canSubmitPayment({ snapReady: true, isLoading: false, total: 12000, hasSlicedResult: true, isSlicing: false, hasSlicingError: false }), true);
  assert.equal(canSubmitPayment({ snapReady: true, isLoading: false, total: 12000, hasSlicedResult: false, isSlicing: false, hasSlicingError: false }), false);
  assert.equal(canSubmitPayment({ snapReady: true, isLoading: false, total: 12000, hasSlicedResult: true, isSlicing: true, hasSlicingError: false }), false);

  console.log("order-checkout-state tests passed");
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
