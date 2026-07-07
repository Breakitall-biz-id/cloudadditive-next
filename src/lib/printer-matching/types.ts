/**
 * TypeScript types for printer matching algorithm
 */

export interface PrinterCandidate {
    id: string;
    providerId: string;
    name: string;
    buildWidth: number;
    buildDepth: number;
    buildHeight: number;
    currentMaterialId: string | null;
    isAcceptingOrders: boolean;
    preprocessingTime: number;
    status: string;
    provider: {
        latitude: number | null;
        longitude: number | null;
        city: string;
    };
    orders: Array<{
        id: string;
        status: string;
        estimatedPrintTime: number | null;
    }>;
}

export interface OrderForMatching {
    id: string;
    materialId: string;
    modelWidth: number | null;
    modelHeight: number | null;
    modelDepth: number | null;
    shippingLat: number;
    shippingLng: number;
    estimatedPrintTime: number | null;
}

export interface PrinterScore {
    printerId: string;
    providerId: string;
    printerName: string;
    score: number;
    canPrintImmediately: boolean;
    breakdown: {
        distanceScore: number;
        distanceKm: number;
        queueTimeScore: number;
        queueTimeMinutes: number;
        materialMatchScore: number;
        materialMatch: boolean;
    };
}

export interface MatchingWeights {
    distance: number;
    queueTime: number;
    materialMatch: number;
}

export const DEFAULT_WEIGHTS: MatchingWeights = {
    distance: 0.4,
    queueTime: 0.4,
    materialMatch: 0.2,
};
