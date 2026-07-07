'use server';

import { z } from 'zod';
import { prisma } from '@/lib/prisma';
import { auth } from '@/lib/auth';
import Midtrans from 'midtrans-client';
import { v4 as uuidv4 } from 'uuid';

// Initialize Midtrans Snap
const snap = new Midtrans.Snap({
    isProduction: process.env.MIDTRANS_IS_PRODUCTION === 'true',
    serverKey: process.env.MIDTRANS_SERVER_KEY || '',
    clientKey: process.env.NEXT_PUBLIC_MIDTRANS_CLIENT_KEY || '',
});

// Schema for order creation input
const CreateOrderSchema = z.object({
    file: z.object({
        url: z.string().url(),
        name: z.string(),
        size: z.number(),
    }),
    materialKey: z.string(),
    qualityKey: z.string(),
    quantity: z.number().min(1).default(1),
    printSettings: z.object({
        infill: z.string(), // e.g. "20%"
        color: z.string().optional(),
    }),
    shipping: z.object({
        recipientName: z.string(),
        phone: z.string(),
        address: z.string(),
        courier: z.string().optional(),
    }),
    totals: z.object({
        printCost: z.number(),
        shippingCost: z.number(),
        serviceFee: z.number(), // Platform fee
        grandTotal: z.number(),
    }),
    // Pre-check selected printer info
    printerId: z.string().optional(),
    providerId: z.string().optional(),
    // Customer coordinates for shipping
    customerCoords: z.object({
        lat: z.number(),
        lng: z.number(),
    }).optional(),
    // Snapshot of parsed G-code data for record keeping
    gcodeData: z.object({
        estimatedTime: z.number().optional(), // in seconds
        filamentLength: z.number().optional(), // in mm
        filamentWeight: z.number().optional(), // in grams
    }).optional(),
});

export type CreateOrderState = {
    success?: boolean;
    orderId?: string;
    snapToken?: string;
    error?: string;
    fieldErrors?: Record<string, string[]>;
};

export async function createOrder(prevState: CreateOrderState, formData: any): Promise<CreateOrderState> {
    const session = await auth();

    if (!session?.user?.id) {
        return { error: "Unauthorized. Please login to continue." };
    }

    return { error: "Invalid call" };
}

// Actual direct action function (not bound to form)
export async function createOrderDirect(data: z.infer<typeof CreateOrderSchema>) {
    const session = await auth();
    if (!session?.user?.id || !session.user.email) {
        throw new Error("Unauthorized");
    }

    const validatedFields = CreateOrderSchema.safeParse(data);

    if (!validatedFields.success) {
        return { error: "Validation failed", details: validatedFields.error.flatten() };
    }

    const { file, materialKey, qualityKey, quantity, printSettings, shipping, totals, gcodeData, printerId, providerId, customerCoords } = validatedFields.data;

    try {
        // Lookup Material and Quality by ID (frontend sends exact IDs like 'pla', 'normal')
        const material = await prisma.material.findUnique({
            where: { id: materialKey }
        });

        const quality = await prisma.printQuality.findUnique({
            where: { id: qualityKey }
        });

        // Throw error if not found
        if (!material) throw new Error(`Material '${materialKey}' not found in database`);
        if (!quality) throw new Error(`Quality '${qualityKey}' not found in database`);

        // 1. Generate Order Number (e.g., ORD-YYYYMMDD-XXXX)
        const dateStr = new Date().toISOString().slice(0, 10).replace(/-/g, '');
        const randomSuffix = Math.floor(Math.random() * 10000).toString().padStart(4, '0');
        const orderNumber = `ORD-${dateStr}-${randomSuffix}`;

        // Detect if file is G-code or STL
        const isGcode = file.name.toLowerCase().endsWith('.gcode');

        // 2. Create Order in DB
        const newOrder = await prisma.order.create({
            data: {
                orderNumber,
                userId: session.user.id,

                // Files - store in appropriate field based on type
                // stlFileUrl always stores the original file (required field)
                // gcodeFileUrl only populated if user uploads G-code directly
                stlFileUrl: file.url,
                stlFileName: file.name,
                stlFileSize: file.size,
                gcodeFileUrl: isGcode ? file.url : null,

                // Print Config
                materialId: material.id,
                qualityId: quality.id,
                quantity,
                colorName: printSettings.color || 'Default',

                // Slicing Data (Snapshot)
                estimatedPrintTime: gcodeData?.estimatedTime,
                filamentLengthMm: gcodeData?.filamentLength,
                filamentWeightG: gcodeData?.filamentWeight,

                // Pricing
                printingCost: totals.printCost,
                shippingCost: totals.shippingCost,
                totalPrice: totals.grandTotal,

                // Shipping
                shippingAddress: `${shipping.recipientName}, ${shipping.phone}\n${shipping.address}`,
                shippingLat: customerCoords?.lat ?? 0,
                shippingLng: customerCoords?.lng ?? 0,

                // Pre-assigned printer/provider from pre-check
                printerId: printerId || null,
                providerId: providerId || null,

                status: 'PENDING_PAYMENT',
            },
        });

        // Round all components first to ensure consistency
        const roundedPrintCost = Math.round(totals.printCost);
        const roundedShippingCost = Math.round(totals.shippingCost);
        const roundedServiceFee = totals.serviceFee > 0 ? Math.round(totals.serviceFee) : 0;

        // Recalculate grand total from components to verify/enforce sum
        const grossAmount = roundedPrintCost + roundedShippingCost + roundedServiceFee;

        // 3. Create Midtrans Transaction
        const transactionDetails = {
            order_id: newOrder.orderNumber, // Use Order Number for Midtrans ID
            gross_amount: grossAmount,
        };

        const customerDetails = {
            first_name: session.user.name?.split(' ')[0] || 'Customer',
            email: session.user.email,
            phone: shipping.phone,
        };

        const itemDetails = [
            {
                id: 'PRINT-SVC',
                price: roundedPrintCost,
                quantity: 1,
                name: `3D Print: ${file.name.substring(0, 40)}`,
            },
            {
                id: 'SHIPPING',
                price: roundedShippingCost,
                quantity: 1,
                name: 'Shipping Fee',
            }
        ];

        // Add platform fee if exists
        if (totals.serviceFee > 0) {
            itemDetails.push({
                id: 'SERVICE-FEE',
                price: roundedServiceFee,
                quantity: 1,
                name: 'Service Fee'
            });
        }

        const midtransParams = {
            transaction_details: transactionDetails,
            customer_details: customerDetails,
            item_details: itemDetails,
        };

        const midtransResponse = await snap.createTransaction(midtransParams);

        // 4. Save Payment Record
        await prisma.payment.create({
            data: {
                orderId: newOrder.id,
                invoiceNumber: `INV-${newOrder.orderNumber}`,
                amount: grossAmount,
                status: 'PENDING',
                snapToken: midtransResponse.token,
                snapUrl: midtransResponse.redirect_url,
            }
        });

        return {
            success: true,
            orderId: newOrder.id,
            orderNumber: newOrder.orderNumber,
            snapToken: midtransResponse.token
        };

    } catch (error) {
        console.error("Order creation error:", error);
        // Return specifics if known (like material not found), else generic but with details if possible
        const errorMessage = error instanceof Error ? error.message : "Failed to create order";
        throw new Error(errorMessage);
    }
}
