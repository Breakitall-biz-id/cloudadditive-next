import { NextResponse } from "next/server";

type StorageUploadResult = {
  success: boolean;
  url: string;
  key: string;
  error?: string;
};

export type CustomerSlicerDependencies = {
  fetcher: typeof fetch;
  uploadToStorage(
    buffer: Buffer,
    key: string,
    contentType: string
  ): Promise<StorageUploadResult>;
  randomId(): string;
};

type CustomerSlicerOptions = {
  slicerUrl: string;
};

function normalizeSlicerUrl(slicerUrl: string) {
  return slicerUrl.replace(/\/+$/, "");
}

function sanitizeFilename(filename: string) {
  return filename.replace(/[^a-zA-Z0-9._-]/g, "_");
}

export function resolveSlicerAssetUrl(assetUrl: string, slicerUrl: string) {
  if (/^https?:\/\//i.test(assetUrl)) return assetUrl;
  return new URL(assetUrl, `${normalizeSlicerUrl(slicerUrl)}/`).toString();
}

export async function handleCustomerSlicerRequest(
  request: Request,
  dependencies: CustomerSlicerDependencies,
  options: CustomerSlicerOptions
) {
  try {
    const slicerUrl = normalizeSlicerUrl(options.slicerUrl);
    const formData = await request.formData();
    const stlFile = formData.get("stl") as File | null;
    const material = (formData.get("material") as string | null) || "pla";
    const quality = (formData.get("quality") as string | null) || "normal";
    const infill = (formData.get("infill") as string | null) || "0.20";

    if (!stlFile) {
      return NextResponse.json(
        { success: false, error: "No STL file provided" },
        { status: 400 }
      );
    }

    console.log(`[Slicer] Slicing file: ${stlFile.name}, size: ${stlFile.size}, material: ${material}, quality: ${quality}`);

    const arrayBuffer = await stlFile.arrayBuffer();
    const blob = new Blob([arrayBuffer], { type: stlFile.type || "application/octet-stream" });

    const slicerFormData = new FormData();
    slicerFormData.append("stl", blob, stlFile.name);
    slicerFormData.append("material", material);
    slicerFormData.append("quality", quality);
    slicerFormData.append("infill", infill);
    slicerFormData.append("printerProfile", "generic_fdm");

    const response = await dependencies.fetcher(`${slicerUrl}/slice`, {
      method: "POST",
      body: slicerFormData,
    });

    const responseText = await response.text();
    console.log(`[Slicer] Response status: ${response.status}, body:`, responseText.substring(0, 200));

    let result;
    try {
      result = JSON.parse(responseText);
    } catch {
      console.error("[Slicer] Non-JSON response:", responseText.substring(0, 500));
      return NextResponse.json(
        { success: false, error: "Slicer returned invalid response" },
        { status: 500 }
      );
    }

    if (!response.ok) {
      return NextResponse.json(
        { success: false, error: result.error || "Slicing failed" },
        { status: response.status }
      );
    }

    const slicedGcodeUrl = result?.result?.gcodeUrl;
    if (typeof slicedGcodeUrl !== "string" || !slicedGcodeUrl.trim()) {
      return NextResponse.json(
        { success: false, error: "Slicer did not return a G-code file" },
        { status: 500 }
      );
    }

    const sourceGcodeUrl = resolveSlicerAssetUrl(slicedGcodeUrl, slicerUrl);
    const gcodeResponse = await dependencies.fetcher(sourceGcodeUrl);
    if (!gcodeResponse.ok) {
      console.error(`[Slicer] Failed to fetch generated G-code: ${gcodeResponse.status}`);
      return NextResponse.json(
        { success: false, error: "Failed to fetch sliced G-code" },
        { status: 500 }
      );
    }

    const gcodeBuffer = Buffer.from(await gcodeResponse.arrayBuffer());
    const sourceName = result.result.gcodeFile || slicedGcodeUrl.split("/").pop() || "sliced.gcode";
    const filename = sanitizeFilename(sourceName.endsWith(".gcode") ? sourceName : `${sourceName}.gcode`);
    const key = `gcode/sliced/${dependencies.randomId()}-${filename}`;
    const uploadResult = await dependencies.uploadToStorage(gcodeBuffer, key, "text/x-gcode");

    if (!uploadResult.success) {
      console.error("[Slicer] Failed to upload generated G-code:", uploadResult.error);
      return NextResponse.json(
        { success: false, error: "Failed to store sliced G-code" },
        { status: 500 }
      );
    }

    return NextResponse.json({
      ...result,
      result: {
        ...result.result,
        gcodeUrl: uploadResult.url,
        gcodeStorageKey: uploadResult.key,
        sourceGcodeUrl: slicedGcodeUrl,
      },
    });
  } catch (error) {
    console.error("[Slicer] Proxy error:", error);
    return NextResponse.json(
      { success: false, error: error instanceof Error ? error.message : "Failed to connect to slicer service" },
      { status: 500 }
    );
  }
}
