import assert from "node:assert/strict";
import { parseMatchingCsv } from "../src/lib/printer-matching/csv";

const header = "label,material_id,latitude,longitude,quantity,estimated_minutes,width_mm,depth_mm,height_mm,address,file_name,quality_id";
const validRow = 'Order A,pla,-7.75,110.4,2,90,20,30,40,"Jalan Kaliurang, Sleman",model.stl,normal';

const perRow = parseMatchingCsv(`${header}\n${validRow}`, {
  fileMode: "per-row",
  uploadedFileNames: ["model.stl"],
});
assert.equal(perRow.globalErrors.length, 0);
assert.equal(perRow.rowErrors.length, 0);
assert.equal(perRow.validRows[0].address, "Jalan Kaliurang, Sleman");
assert.equal(perRow.validRows[0].quantity, 2);
assert.equal(perRow.validRows[0].qualityMode, "sliced");

const gcode = parseMatchingCsv(
  `${header}\nOrder G,pla,-7.75,110.4,1,20,10,10,10,Address,job.gcode,fine`,
  { fileMode: "per-row", uploadedFileNames: ["job.gcode"] }
);
assert.equal(gcode.validRows[0].qualityMode, "informational");

const shared = parseMatchingCsv(
  `${header}\nOrder B,pla,-7.75,110.4,1,45,10,10,10,Address,,normal`,
  {
    fileMode: "shared",
    sharedFileName: "shared.stl",
    uploadedFileNames: ["shared.stl"],
  }
);
assert.equal(shared.validRows[0].fileName, "shared.stl");

assert.ok(
  parseMatchingCsv(`${header}\n${validRow}`, {
    fileMode: "per-row",
    uploadedFileNames: [],
  }).rowErrors.some((error) => error.message.includes("model.stl"))
);
assert.ok(
  parseMatchingCsv(`${header}\n${validRow}`, {
    fileMode: "per-row",
    uploadedFileNames: ["model.stl", "model.stl"],
  }).globalErrors.some((error) => error.includes("Duplicate"))
);
assert.ok(
  parseMatchingCsv(
    `${header}\nBad,pla,999,110.4,0,45,10,10,10,Address,bad.exe,normal`,
    { fileMode: "per-row", uploadedFileNames: ["bad.exe"] }
  ).rowErrors.length > 0
);

const tooManyRows = Array.from({ length: 101 }, (_, index) =>
  `Order ${index},pla,-7.75,110.4,1,45,10,10,10,Address,model.stl,normal`
).join("\n");
assert.ok(
  parseMatchingCsv(`${header}\n${tooManyRows}`, {
    fileMode: "per-row",
    uploadedFileNames: ["model.stl"],
  }).globalErrors.some((error) => error.includes("100"))
);

console.log("printer-matching-csv tests passed");
