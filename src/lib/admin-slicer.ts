import { NextResponse } from "next/server";

export type AdminSlicerDependencies = {
  authenticate(): Promise<{ role?: string } | null>;
  findMaterial(id: string): Promise<{ id: string } | null>;
  findQuality(id: string): Promise<{ id: string } | null>;
  fetcher: typeof fetch;
};

export async function handleAdminSlicerRequest(
  request: Request,
  dependencies: AdminSlicerDependencies,
  options: { maxFileSize: number; slicerUrl: string }
) {
  const session = await dependencies.authenticate();
  if (session?.role !== "ADMIN") {
    return NextResponse.json({ success: false, error: "Forbidden" }, { status: 403 });
  }

  const formData = await request.formData();
  const file = formData.get("stl");
  const materialId = String(formData.get("material") ?? "");
  const qualityId = String(formData.get("quality") ?? "");
  if (!(file instanceof File)) {
    return NextResponse.json({ success: false, error: "STL file is required" }, { status: 400 });
  }
  if (!file.name.toLowerCase().endsWith(".stl")) {
    return NextResponse.json({ success: false, error: "Only STL files are supported" }, { status: 400 });
  }
  if (file.size <= 0 || file.size > options.maxFileSize) {
    return NextResponse.json({ success: false, error: "Invalid STL file size" }, { status: 400 });
  }

  const [material, quality] = await Promise.all([
    dependencies.findMaterial(materialId),
    dependencies.findQuality(qualityId),
  ]);
  if (!material || !quality) {
    return NextResponse.json(
      { success: false, error: "Material or quality is inactive/invalid" },
      { status: 400 }
    );
  }

  const upstream = new FormData();
  upstream.append("stl", file, file.name);
  upstream.append("material", material.id);
  upstream.append("quality", quality.id);
  upstream.append("infill", String(formData.get("infill") ?? "0.20"));
  upstream.append("printerProfile", "generic_fdm");

  try {
    const response = await dependencies.fetcher(`${options.slicerUrl}/slice`, {
      method: "POST",
      body: upstream,
    });
    const body = await response.text();
    let result: unknown;
    try {
      result = JSON.parse(body);
    } catch {
      return NextResponse.json(
        { success: false, error: "Slicer returned an invalid response" },
        { status: 502 }
      );
    }

    return NextResponse.json(result, { status: response.status });
  } catch (error) {
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : "Slicer unavailable",
      },
      { status: 502 }
    );
  }
}
