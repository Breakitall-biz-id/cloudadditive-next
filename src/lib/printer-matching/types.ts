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
    lastSeenAt: Date | string | null;
    materialIds: string[];
    provider: {
        businessName: string;
        latitude: number | null;
        longitude: number | null;
        city: string;
        province: string;
        isVerified: boolean;
    };
    orders: Array<{
        id: string;
        status: string;
        estimatedPrintTime: number | null;
        quantity: number;
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
    quantity: number;
    dueDate?: Date | string | null;
}

export interface PrinterScore {
    printerId: string;
    providerId: string;
    printerName: string;
    score: number;
    canPrintImmediately: boolean;
    breakdown: {
        distanceKm: number;
        waitMinutes: number;
        jobsAhead: number;
        projectedMinutesAfter: number;
        projectedJobsAfter: number;
        distanceScore: number;
        queueDurationScore: number;
        queueCountScore: number;
        loadedMaterialScore: number;
        materialMatch: boolean;
        // Temporary aliases for current UI and assignment callers.
        queueTimeScore: number;
        queueTimeMinutes: number;
        materialMatchScore: number;
    };
}

export interface MatchedPrinter extends PrinterScore {
    providerName: string;
    providerCity: string;
    providerProvince: string;
    coordinates: {
        lat: number;
        lng: number;
    };
    isVerified: boolean;
    status: string;
    isAcceptingOrders: boolean;
    queuedOrders: number;
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
