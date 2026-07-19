import assert from "node:assert/strict";
import { analyzeStlBuffer, hashBuffer } from "../src/lib/stl-analysis";

const stl = `solid tetra
facet normal 0 0 1
 outer loop
  vertex 0 0 0
  vertex 10 0 0
  vertex 0 20 0
 endloop
endfacet
facet normal 1 0 0
 outer loop
  vertex 0 0 0
  vertex 0 20 0
  vertex 0 0 30
 endloop
endfacet
facet normal 0 1 0
 outer loop
  vertex 0 0 0
  vertex 0 0 30
  vertex 10 0 0
 endloop
endfacet
facet normal 1 1 1
 outer loop
  vertex 10 0 0
  vertex 0 0 30
  vertex 0 20 0
 endloop
endfacet
endsolid tetra`;
const bytes = new TextEncoder().encode(stl);
const buffer = bytes.buffer.slice(bytes.byteOffset, bytes.byteOffset + bytes.byteLength);

assert.deepEqual(analyzeStlBuffer(buffer), {
  width: 10,
  height: 20,
  depth: 30,
});
async function main() {
  assert.equal((await hashBuffer(buffer)).length, 64);
  assert.equal(await hashBuffer(buffer), await hashBuffer(buffer));
  console.log("stl-analysis tests passed");
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
