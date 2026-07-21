'use server';

import { z } from 'zod';
import type { Prisma } from '@prisma/client';
import { prisma } from '@/lib/prisma';
import { auth } from '@/lib/auth';
import Midtrans from 'midtrans-client';
import { printerMatchingService, type PrinterMatchingResult } from '@/lib/printer-matching/service';
import { secondsToWholeMinutes } from '@/lib/printer-matching/projection';
import type { OrderForMatching } from '@/lib/printer-matching/types';
import { parseOrderDueDate } from '@/lib/order-due-date';
import { parseCourierSelection } from '@/lib/order-shipping';

const snap = new Midtrans.Snap({
    isProduction: process.env.MIDTRANS_IS_PRODUCTION === 'true',
    serverKey: process.env.MIDTRANS_SERVER_KEY || '',
    clientKey: process.env.NEXT_PUBLIC_MIDTRANS_CLIENT_KEY || '',
});

const CreateOrderSchema = z.object({
    file: z.object({
        url: z.string().url(),
        name: z.string().trim().min(1),
        size: z.number().int().nonnegative(),
    }),
    materialKey: z.string().trim().min(1),
    qualityKey: z.string().trim().min(1),
    quantity: z.number().int().positive().default(1),
    printSettings: z.object({
        infill: z.string(),
        color: z.string().optional(),
    }),
    shipping: z.object({
        recipientName: z.string().trim().min(1),
        phone: z.string().trim().min(1),
        address: z.string().trim().min(1),
        courier: z.string().optional(),
    }),
    totals: z.object({
        printCost: z.number().nonnegative(),
        shippingCost: z.number().nonnegative(),
        serviceFee: z.number().nonnegative(),
        grandTotal: z.number().nonnegative(),
    }),
    printerId: z.string().trim().min(1),
    // Kept in the payload only for backward compatibility; the server ignores it.
    providerId: z.string().optional(),
    customerCoords: z.object({
        lat: z.number().finite().min(-90).max(90),
        lng: z.number().finite().min(-180).max(180),
    }),
    dueDate: z.string().trim().optional(),
    modelDimensions: z.object({
        width: z.number().finite().positive(),
        height: z.number().finite().positive(),
        depth: z.number().finite().positive(),
    }).optional(),
    gcodeData: z.object({
        estimatedTime: z.number().finite().nonnegative().optional(),
        filamentLength: z.number().finite().nonnegative().optional(),
        filamentWeight: z.number().finite().nonnegative().optional(),
        gcodeUrl: z.string().url().optional(),
    }).optional(),
});

export type CreateOrderInput = z.infer<typeof CreateOrderSchema>;

type AuthenticatedCustomer = {
    userId: string;
    email: string;
    name?: string | null;
};

type SnapResponse = {
    token: string;
    redirect_url: string;
};

type SnapParameters = {
    transaction_details: { order_id: string; gross_amount: number };
    customer_details: { first_name: string; email: string; phone: string };
    item_details: Array<{ id: string; price: number; quantity: number; name: string }>;
};

export type CreateOrderDependencies = {
    findMaterial(id: string): Promise<{ id: string } | null>;
    findQuality(id: string): Promise<{ id: string } | null>;
    matchPrinter(order: OrderForMatching): Promise<PrinterMatchingResult>;
    createOrder(data: Prisma.OrderUncheckedCreateInput): Promise<{ id: string; orderNumber: string }>;
    createSnapTransaction(parameters: SnapParameters): Promise<SnapResponse>;
    createPayment(data: Prisma.PaymentUncheckedCreateInput): Promise<void>;
    now(): Date;
    randomSuffix(): string;
};

export type CreateOrderResult = {
    success: boolean;
    orderId?: string;
    orderNumber?: string;
    snapToken?: string;
    error?: string;
};

const productionDependencies: CreateOrderDependencies = {
    findMaterial: (id) => prisma.material.findFirst({
        where: { id, isActive: true },
        select: { id: true },
    }),
    findQuality: (id) => prisma.printQuality.findFirst({
        where: { id, isActive: true },
        select: { id: true },
    }),
    matchPrinter: (order) => printerMatchingService.match(order),
    createOrder: (data) => prisma.order.create({
        data,
        select: { id: true, orderNumber: true },
    }),
    createSnapTransaction: (parameters) => snap.createTransaction(parameters),
    createPayment: async (data) => {
        await prisma.payment.create({ data });
    },
    now: () => new Date(),
    randomSuffix: () => Math.floor(Math.random() * 10000).toString().padStart(4, '0'),
};

export async function createOrderWithDependencies(
    data: CreateOrderInput,
    customer: AuthenticatedCustomer,
    dependencies: CreateOrderDependencies
): Promise<CreateOrderResult> {
    const [material, quality] = await Promise.all([
        dependencies.findMaterial(data.materialKey),
        dependencies.findQuality(data.qualityKey),
    ]);

    if (!material) {
        return { success: false, error: `Material '${data.materialKey}' tidak tersedia` };
    }
    if (!quality) {
        return { success: false, error: `Kualitas '${data.qualityKey}' tidak tersedia` };
    }

    let dueDate: Date | null = null;
    try {
        dueDate = parseOrderDueDate(data.dueDate, dependencies.now());
    } catch (error) {
        return { success: false, error: error instanceof Error ? error.message : 'Due date tidak valid' };
    }

    const estimatedPrintTime = data.gcodeData?.estimatedTime === undefined
        ? null
        : secondsToWholeMinutes(data.gcodeData.estimatedTime);
    const matchingOrder: OrderForMatching = {
        id: 'checkout',
        materialId: material.id,
        modelWidth: data.modelDimensions?.width ?? null,
        modelHeight: data.modelDimensions?.height ?? null,
        modelDepth: data.modelDimensions?.depth ?? null,
        shippingLat: data.customerCoords.lat,
        shippingLng: data.customerCoords.lng,
        estimatedPrintTime,
        quantity: data.quantity,
        dueDate,
    };
    const matchingResult = await dependencies.matchPrinter(matchingOrder);

    if (!matchingResult.success) {
        return { success: false, error: matchingResult.error };
    }
    if (matchingResult.bestPrinter.printerId !== data.printerId) {
        return {
            success: false,
            error: 'Ketersediaan printer berubah. Silakan cek ulang printer sebelum membayar.',
        };
    }

    const dateStr = dependencies.now().toISOString().slice(0, 10).replace(/-/g, '');
    const orderNumber = `ORD-${dateStr}-${dependencies.randomSuffix()}`;
    const roundedPrintCost = Math.round(data.totals.printCost);
    const roundedShippingCost = Math.round(data.totals.shippingCost);
    const roundedServiceFee = Math.round(data.totals.serviceFee);
    const grossAmount = roundedPrintCost + roundedShippingCost + roundedServiceFee;
    const isGcode = data.file.name.toLowerCase().endsWith('.gcode');
    const courierSelection = parseCourierSelection(data.shipping.courier);

    const newOrder = await dependencies.createOrder({
        orderNumber,
        userId: customer.userId,
        stlFileUrl: data.file.url,
        stlFileName: data.file.name,
        stlFileSize: data.file.size,
        gcodeFileUrl: isGcode ? data.file.url : data.gcodeData?.gcodeUrl ?? null,
        materialId: material.id,
        qualityId: quality.id,
        quantity: data.quantity,
        colorName: data.printSettings.color || 'Default',
        estimatedPrintTime,
        filamentLengthMm: data.gcodeData?.filamentLength,
        filamentWeightG: data.gcodeData?.filamentWeight,
        modelWidth: data.modelDimensions?.width,
        modelHeight: data.modelDimensions?.height,
        modelDepth: data.modelDimensions?.depth,
        printingCost: roundedPrintCost,
        shippingCost: roundedShippingCost,
        totalPrice: grossAmount,
        shippingAddress: `${data.shipping.recipientName}, ${data.shipping.phone}\n${data.shipping.address}`,
        shippingLat: data.customerCoords.lat,
        shippingLng: data.customerCoords.lng,
        courierCode: courierSelection.courierCode,
        courierService: courierSelection.courierService,
        dueDate,
        printerId: matchingResult.bestPrinter.printerId,
        providerId: matchingResult.bestPrinter.providerId,
        status: 'PENDING_PAYMENT',
    });

    const itemDetails: SnapParameters['item_details'] = [
        {
            id: 'PRINT-SVC',
            price: roundedPrintCost,
            quantity: 1,
            name: `3D Print: ${data.file.name.substring(0, 40)}`,
        },
        {
            id: 'SHIPPING',
            price: roundedShippingCost,
            quantity: 1,
            name: 'Shipping Fee',
        },
    ];
    if (roundedServiceFee > 0) {
        itemDetails.push({
            id: 'SERVICE-FEE',
            price: roundedServiceFee,
            quantity: 1,
            name: 'Service Fee',
        });
    }

    const midtransResponse = await dependencies.createSnapTransaction({
        transaction_details: {
            order_id: newOrder.orderNumber,
            gross_amount: grossAmount,
        },
        customer_details: {
            first_name: customer.name?.split(' ')[0] || 'Customer',
            email: customer.email,
            phone: data.shipping.phone,
        },
        item_details: itemDetails,
    });

    await dependencies.createPayment({
        orderId: newOrder.id,
        invoiceNumber: `INV-${newOrder.orderNumber}`,
        amount: grossAmount,
        status: 'PENDING',
        snapToken: midtransResponse.token,
        snapUrl: midtransResponse.redirect_url,
    });

    return {
        success: true,
        orderId: newOrder.id,
        orderNumber: newOrder.orderNumber,
        snapToken: midtransResponse.token,
    };
}

export async function createOrderDirect(data: CreateOrderInput): Promise<CreateOrderResult> {
    const session = await auth();
    if (!session?.user?.id || !session.user.email) {
        return { success: false, error: 'Unauthorized' };
    }

    const validated = CreateOrderSchema.safeParse(data);
    if (!validated.success) {
        return { success: false, error: 'Data order tidak valid' };
    }

    try {
        return await createOrderWithDependencies(
            validated.data,
            {
                userId: session.user.id,
                email: session.user.email,
                name: session.user.name,
            },
            productionDependencies
        );
    } catch (error) {
        console.error('Order creation error:', error);
        return {
            success: false,
            error: error instanceof Error ? error.message : 'Gagal membuat order',
        };
    }
}
