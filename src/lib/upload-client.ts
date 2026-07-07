/**
 * Upload a file to R2 storage via the API
 */
export async function uploadFile(
    file: File,
    type: "stl" | "gcode" | "print-photo",
    orderId?: string
): Promise<{ success: boolean; url: string; key: string; error?: string }> {
    const formData = new FormData();
    formData.append("file", file);
    formData.append("type", type);
    if (orderId) formData.append("orderId", orderId);

    try {
        const response = await fetch("/api/upload", {
            method: "POST",
            body: formData,
        });

        const data = await response.json();

        if (!response.ok) {
            return {
                success: false,
                url: "",
                key: "",
                error: data.error || "Upload failed",
            };
        }

        return data; // { success: true, url, key, filename, size }
    } catch (error) {
        console.error("Upload error:", error);
        return {
            success: false,
            url: "",
            key: "",
            error: error instanceof Error ? error.message : "Network error during upload",
        };
    }
}
