type AutoSliceInput = {
  filePresent: boolean;
  isGcode: boolean;
  selectedMaterial: string | null;
  selectedQuality: string | null;
  hasSlicedResult: boolean;
  isSlicing: boolean;
  hasSlicingError: boolean;
  currentAttemptKey: string | null;
  lastAttemptKey: string | null;
};

type PaymentGateInput = {
  hasSlicedResult: boolean;
  isSlicing: boolean;
  hasSlicingError: boolean;
};

type SubmitPaymentInput = PaymentGateInput & {
  snapReady: boolean;
  isLoading: boolean;
  total: number;
};

export function slicingAttemptKey(input: {
  fileName: string;
  fileSize: number;
  fileLastModified?: number;
  selectedMaterial: string | null;
  selectedQuality: string | null;
}) {
  return [
    input.fileName,
    input.fileSize,
    input.fileLastModified ?? 0,
    input.selectedMaterial ?? "material:none",
    input.selectedQuality ?? "quality:none",
  ].join(":");
}

export function shouldAutoStartSlicing(input: AutoSliceInput) {
  if (!input.filePresent || input.hasSlicedResult || input.isSlicing || !input.currentAttemptKey) {
    return false;
  }

  if (!input.isGcode && (!input.selectedMaterial || !input.selectedQuality)) {
    return false;
  }

  if (input.hasSlicingError && input.lastAttemptKey === input.currentAttemptKey) {
    return false;
  }

  return true;
}

export function canEnterPaymentStep(input: PaymentGateInput) {
  return input.hasSlicedResult && !input.isSlicing && !input.hasSlicingError;
}

export function canSubmitPayment(input: SubmitPaymentInput) {
  return (
    input.snapReady &&
    !input.isLoading &&
    input.total > 0 &&
    canEnterPaymentStep(input)
  );
}
