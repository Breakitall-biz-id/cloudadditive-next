import assert from "node:assert/strict";
import {
  handleAdminSlicerRequest,
  type AdminSlicerDependencies,
} from "../src/lib/admin-slicer";

function request(fileName = "model.stl") {
  const form = new FormData();
  form.append("stl", new File(["solid model\nendsolid model"], fileName));
  form.append("material", "pla");
  form.append("quality", "normal");
  return new Request("http://localhost/api/admin/printer-matching/slice", {
    method: "POST",
    body: form,
  });
}

const validDeps: AdminSlicerDependencies = {
  authenticate: async () => ({ role: "ADMIN" }),
  findMaterial: async () => ({ id: "pla" }),
  findQuality: async () => ({ id: "normal" }),
  fetcher: async () => new Response(JSON.stringify({ success: true, result: { printTimeMinutes: 30 } }), {
    status: 200,
    headers: { "content-type": "application/json" },
  }),
};

async function main() {
  const options = { maxFileSize: 1024, slicerUrl: "http://slicer" };
  const anonymous = await handleAdminSlicerRequest(request(), {
    ...validDeps,
    authenticate: async () => null,
  }, options);
  assert.equal(anonymous.status, 403);

  const unsupported = await handleAdminSlicerRequest(request("model.exe"), validDeps, options);
  assert.equal(unsupported.status, 400);

  const inactive = await handleAdminSlicerRequest(request(), {
    ...validDeps,
    findMaterial: async () => null,
  }, options);
  assert.equal(inactive.status, 400);

  const valid = await handleAdminSlicerRequest(request(), validDeps, options);
  assert.equal(valid.status, 200);
  assert.equal((await valid.json()).success, true);

  console.log("admin-slicer-route tests passed");
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
