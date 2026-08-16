import assert from "node:assert/strict";
import {
  handleCustomerSlicerRequest,
  resolveSlicerAssetUrl,
  type CustomerSlicerDependencies,
} from "../src/lib/customer-slicer";

function request(fileName = "model.stl") {
  const form = new FormData();
  form.append("stl", new File(["solid model\nendsolid model"], fileName));
  form.append("material", "abs");
  form.append("quality", "draft");
  return new Request("http://localhost/api/slicer/slice", {
    method: "POST",
    body: form,
  });
}

async function main() {
  assert.equal(
    resolveSlicerAssetUrl("/gcode/generated.gcode", "http://slicer:3001/"),
    "http://slicer:3001/gcode/generated.gcode"
  );
  assert.equal(
    resolveSlicerAssetUrl("https://files.example/generated.gcode", "http://slicer:3001/"),
    "https://files.example/generated.gcode"
  );

  const calls: Array<{ key: string; size: number; contentType: string }> = [];
  const deps: CustomerSlicerDependencies = {
    fetcher: async (input) => {
      const url = String(input);
      if (url.endsWith("/slice")) {
        return new Response(JSON.stringify({
          success: true,
          result: {
            gcodeFile: "generated.gcode",
            gcodeUrl: "/gcode/generated.gcode",
            printTimeMinutes: 8,
            filamentGrams: 2.93,
            layerCount: 20,
          },
        }), { status: 200, headers: { "content-type": "application/json" } });
      }
      if (url.endsWith("/gcode/generated.gcode")) {
        return new Response("G1 X1 Y1", { status: 200, headers: { "content-type": "text/x-gcode" } });
      }
      throw new Error(`Unexpected fetch ${url}`);
    },
    uploadToStorage: async (buffer, key, contentType) => {
      calls.push({ key, size: buffer.length, contentType });
      return { success: true, url: `https://r2.example/${key}`, key };
    },
    randomId: () => "fixed-id",
  };

  const response = await handleCustomerSlicerRequest(request(), deps, { slicerUrl: "http://slicer:3001/" });
  assert.equal(response.status, 200);
  const body = await response.json();
  assert.equal(body.success, true);
  assert.equal(body.result.gcodeUrl, "https://r2.example/gcode/sliced/fixed-id-generated.gcode");
  assert.equal(body.result.sourceGcodeUrl, "/gcode/generated.gcode");
  assert.deepEqual(calls, [{ key: "gcode/sliced/fixed-id-generated.gcode", size: 8, contentType: "text/x-gcode" }]);

  const missing = await handleCustomerSlicerRequest(request(), {
    ...deps,
    uploadToStorage: async () => ({ success: false, url: "", key: "", error: "R2 unavailable" }),
  }, { slicerUrl: "http://slicer:3001/" });
  assert.equal(missing.status, 500);
  assert.equal((await missing.json()).error, "Failed to store sliced G-code");

  console.log("customer-slicer-route tests passed");
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
