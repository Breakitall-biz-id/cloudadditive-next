export type CourierSelection = {
  courierCode: string | null;
  courierService: string | null;
};

export function parseCourierSelection(selection?: string | null): CourierSelection {
  const value = selection?.trim();
  if (!value) {
    return { courierCode: null, courierService: null };
  }

  const [courierCode, ...serviceParts] = value.split("-");
  return {
    courierCode: courierCode || value,
    courierService: serviceParts.length > 0 ? serviceParts.join("-") : null,
  };
}

export function formatCourierLabel(courierCode?: string | null, courierService?: string | null) {
  const code = courierCode?.trim();
  const service = courierService?.trim();

  if (!code && !service) return "Courier tersimpan";
  if (!service && code?.includes("-")) return code.split("-").join(" ").toUpperCase();
  return [code, service].filter(Boolean).join(" ").toUpperCase();
}

export function buildShipmentHistoryNote(input: {
  trackingNumber: string;
  courierCode?: string | null;
  courierService?: string | null;
}) {
  const courierLabel = formatCourierLabel(input.courierCode, input.courierService);
  return `Shipped via ${courierLabel}, tracking: ${input.trackingNumber}`;
}
