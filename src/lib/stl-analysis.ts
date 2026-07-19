import { STLLoader } from "three/addons/loaders/STLLoader.js";

export type StlDimensions = {
  width: number;
  height: number;
  depth: number;
};

function roundMillimeters(value: number) {
  return Math.round(value * 100) / 100;
}

export function analyzeStlBuffer(buffer: ArrayBuffer): StlDimensions {
  if (buffer.byteLength === 0) {
    throw new Error("STL file is empty");
  }

  const geometry = new STLLoader().parse(buffer);
  geometry.computeBoundingBox();
  const box = geometry.boundingBox;
  if (!box) {
    throw new Error("Unable to calculate STL dimensions");
  }

  const width = box.max.x - box.min.x;
  const height = box.max.y - box.min.y;
  const depth = box.max.z - box.min.z;
  if (![width, height, depth].every(Number.isFinite)) {
    throw new Error("STL contains invalid geometry");
  }

  geometry.dispose();
  return {
    width: roundMillimeters(width),
    height: roundMillimeters(height),
    depth: roundMillimeters(depth),
  };
}

export async function hashBuffer(buffer: ArrayBuffer): Promise<string> {
  const digest = await crypto.subtle.digest("SHA-256", buffer);
  return Array.from(new Uint8Array(digest))
    .map((byte) => byte.toString(16).padStart(2, "0"))
    .join("");
}
