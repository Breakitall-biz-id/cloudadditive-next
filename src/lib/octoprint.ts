/**
 * OctoPrint API Integration
 * Handles communication with OctoPrint instances via their REST API
 */

import { prisma } from "@/lib/prisma";
import { resolveDownloadUrl } from "@/lib/r2-storage";

interface OctoPrintPrinter {
    id: string;
    octoprintUrl: string;
    octoprintApiKey: string;
    name: string;
}

interface UploadResult {
    success: boolean;
    filename?: string;
    error?: string;
}

interface PrintJobResult {
    success: boolean;
    message?: string;
    error?: string;
}

/**
 * Upload G-code file to OctoPrint
 */
export async function uploadGcodeToOctoPrint(
    printer: OctoPrintPrinter,
    gcodeUrl: string,
    filename: string
): Promise<UploadResult> {
    if (!printer.octoprintUrl || !printer.octoprintApiKey) {
        console.log(`[OctoPrint] Printer ${printer.name} missing OctoPrint config`);
        return { success: false, error: "Printer not configured with OctoPrint" };
    }

    try {
        // Fetch G-code file from storage
        const gcodeResponse = await fetch(gcodeUrl);
        if (!gcodeResponse.ok) {
            throw new Error(`Failed to fetch G-code from storage: ${gcodeResponse.status}`);
        }

        const gcodeBuffer = await gcodeResponse.arrayBuffer();
        const gcodeBlob = new Blob([gcodeBuffer], { type: "application/octet-stream" });

        // Prepare form data for OctoPrint upload
        const formData = new FormData();
        formData.append("file", gcodeBlob, filename);
        formData.append("select", "true"); // Select file after upload
        formData.append("print", "false"); // Don't start printing yet

        // Upload to OctoPrint
        const uploadUrl = `${printer.octoprintUrl}/api/files/local`;
        console.log(`[OctoPrint] Uploading ${filename} to ${printer.name}`);

        const response = await fetch(uploadUrl, {
            method: "POST",
            headers: {
                "X-Api-Key": printer.octoprintApiKey,
            },
            body: formData,
        });

        if (!response.ok) {
            const errorText = await response.text();
            console.error(`[OctoPrint] Upload failed: ${response.status} - ${errorText}`);
            return {
                success: false,
                error: `Upload failed: ${response.status}`
            };
        }

        const result = await response.json();
        console.log(`[OctoPrint] Upload successful: ${result.files?.local?.name || filename}`);

        return {
            success: true,
            filename: result.files?.local?.name || filename
        };

    } catch (error) {
        console.error(`[OctoPrint] Upload error:`, error);
        return {
            success: false,
            error: error instanceof Error ? error.message : "Upload failed"
        };
    }
}

/**
 * Start a print job on OctoPrint
 */
export async function startPrintJob(
    printer: OctoPrintPrinter,
    filename: string
): Promise<PrintJobResult> {
    if (!printer.octoprintUrl || !printer.octoprintApiKey) {
        return { success: false, error: "Printer not configured with OctoPrint" };
    }

    try {
        // First, select the file
        const selectUrl = `${printer.octoprintUrl}/api/files/local/${encodeURIComponent(filename)}`;

        const selectResponse = await fetch(selectUrl, {
            method: "POST",
            headers: {
                "X-Api-Key": printer.octoprintApiKey,
                "Content-Type": "application/json",
            },
            body: JSON.stringify({ command: "select" }),
        });

        if (!selectResponse.ok) {
            console.error(`[OctoPrint] Failed to select file: ${selectResponse.status}`);
        }

        // Start the print job
        const jobUrl = `${printer.octoprintUrl}/api/job`;
        console.log(`[OctoPrint] Starting print job for ${filename} on ${printer.name}`);

        const response = await fetch(jobUrl, {
            method: "POST",
            headers: {
                "X-Api-Key": printer.octoprintApiKey,
                "Content-Type": "application/json",
            },
            body: JSON.stringify({ command: "start" }),
        });

        if (!response.ok) {
            const errorText = await response.text();
            console.error(`[OctoPrint] Start job failed: ${response.status} - ${errorText}`);
            return {
                success: false,
                error: `Failed to start print: ${response.status}`
            };
        }

        console.log(`[OctoPrint] Print job started on ${printer.name}`);
        return {
            success: true,
            message: `Print job started on ${printer.name}`
        };

    } catch (error) {
        console.error(`[OctoPrint] Start job error:`, error);
        return {
            success: false,
            error: error instanceof Error ? error.message : "Failed to start print"
        };
    }
}

/**
 * Cancel a print job on OctoPrint
 */
export async function cancelPrintJob(
    printer: OctoPrintPrinter
): Promise<PrintJobResult> {
    if (!printer.octoprintUrl || !printer.octoprintApiKey) {
        return { success: false, error: "Printer not configured with OctoPrint" };
    }

    try {
        const jobUrl = `${printer.octoprintUrl}/api/job`;

        const response = await fetch(jobUrl, {
            method: "POST",
            headers: {
                "X-Api-Key": printer.octoprintApiKey,
                "Content-Type": "application/json",
            },
            body: JSON.stringify({ command: "cancel" }),
        });

        if (!response.ok) {
            return {
                success: false,
                error: `Failed to cancel: ${response.status}`
            };
        }

        return { success: true, message: "Print job cancelled" };

    } catch (error) {
        return {
            success: false,
            error: error instanceof Error ? error.message : "Failed to cancel"
        };
    }
}

/**
 * Get printer status from OctoPrint
 */
export async function getPrinterStatus(
    printer: OctoPrintPrinter
): Promise<{ connected: boolean; printing: boolean; progress?: number; error?: string }> {
    if (!printer.octoprintUrl || !printer.octoprintApiKey) {
        return { connected: false, printing: false, error: "Not configured" };
    }

    try {
        const response = await fetch(`${printer.octoprintUrl}/api/job`, {
            headers: { "X-Api-Key": printer.octoprintApiKey },
        });

        if (!response.ok) {
            return { connected: false, printing: false, error: `HTTP ${response.status}` };
        }

        const data = await response.json();

        return {
            connected: true,
            printing: data.state === "Printing",
            progress: data.progress?.completion || 0,
        };

    } catch (error) {
        return {
            connected: false,
            printing: false,
            error: error instanceof Error ? error.message : "Connection failed"
        };
    }
}

/**
 * Start a print for an order
 * This is the main entry point - handles upload and print start
 */
export async function startOrderPrint(
    orderId: string,
    printerId: string
): Promise<PrintJobResult> {
    console.log(`[OctoPrint] Starting print for order ${orderId} on printer ${printerId}`);

    // Fetch order and printer details
    const [order, printer] = await Promise.all([
        prisma.order.findUnique({
            where: { id: orderId },
            select: {
                id: true,
                gcodeFileUrl: true,
                stlFileName: true,
            },
        }),
        prisma.printer.findUnique({
            where: { id: printerId },
            select: {
                id: true,
                name: true,
                octoprintUrl: true,
                octoprintApiKey: true,
            },
        }),
    ]);

    if (!order) {
        return { success: false, error: "Order not found" };
    }

    if (!printer) {
        return { success: false, error: "Printer not found" };
    }

    if (!printer.octoprintUrl || !printer.octoprintApiKey) {
        console.log(`[OctoPrint] Printer ${printer.name} not configured - skipping auto-start`);
        return {
            success: false,
            error: "Printer not configured with OctoPrint"
        };
    }

    // Create properly typed OctoPrint printer object (after null checks)
    const octoprintPrinter: OctoPrintPrinter = {
        id: printer.id,
        name: printer.name,
        octoprintUrl: printer.octoprintUrl,
        octoprintApiKey: printer.octoprintApiKey,
    };

    // Check if G-code is available
    if (!order.gcodeFileUrl) {
        console.log(`[OctoPrint] Order ${orderId} has no G-code - needs slicing first`);
        return {
            success: false,
            error: "Order needs to be sliced first"
        };
    }

    // Generate filename from STL name
    const baseName = order.stlFileName?.replace(/\.stl$/i, "") || `order_${orderId}`;
    const gcodeFilename = `${baseName}.gcode`;

    const downloadUrl = await resolveDownloadUrl(order.gcodeFileUrl);

    // Upload G-code to OctoPrint
    const uploadResult = await uploadGcodeToOctoPrint(
        octoprintPrinter,
        downloadUrl,
        gcodeFilename
    );

    if (!uploadResult.success) {
        return {
            success: false,
            error: `Upload failed: ${uploadResult.error}`
        };
    }

    // Start the print job
    const startResult = await startPrintJob(
        octoprintPrinter,
        uploadResult.filename || gcodeFilename
    );

    if (startResult.success) {
        // Update order status to PRINTING
        await prisma.order.update({
            where: { id: orderId },
            data: {
                status: "PRINTING",
                printStartedAt: new Date(),
            },
        });

        // Add status history
        await prisma.orderStatusHistory.create({
            data: {
                orderId,
                status: "PRINTING",
                note: `Print started on ${printer.name}`,
                changedBy: "SYSTEM",
            },
        });
    }

    return startResult;
}
