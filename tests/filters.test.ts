import { it, expect } from "vitest";
import { evalFilter } from "@/lib/filters";

// Regresi: modal View memfilter Pengurus dengan hasAnyOf pada field tautan ke Umat.
// Dulu operator ini melempar error, lalu UI jatuh ke kolom manual lama di Umat (jabatan periode sebelumnya).
const f = { operator: "and", operands: [
  { operator: "hasAnyOf", operands: ["fldLink", ["recCKovxaNhfkmFF4"]] },
  { operator: "contains", operands: ["fldPeriode", "2026-2031"] },
] };

it("hasAnyOf cocok pada tautan {id,name} dan periode benar", () => {
  expect(evalFilter(f, { fldLink: [{ id: "recCKovxaNhfkmFF4", name: "Andry" }], fldPeriode: [{ id: "x", name: "2026-2031" }] })).toBe(true);
});
it("hasAnyOf menolak periode lain atau orang lain", () => {
  expect(evalFilter(f, { fldLink: [{ id: "recCKovxaNhfkmFF4", name: "Andry" }], fldPeriode: [{ id: "y", name: "2023-2026" }] })).toBe(false);
  expect(evalFilter(f, { fldLink: [{ id: "recZZZZZZZZZZZZZZ", name: "Lain" }], fldPeriode: [{ id: "x", name: "2026-2031" }] })).toBe(false);
});
it("hasAnyOf menerima id mentah dan hasAllOf", () => {
  expect(evalFilter({ operator: "hasAnyOf", operands: ["a", ["r1"]] }, { a: ["r1", "r2"] })).toBe(true);
  expect(evalFilter({ operator: "hasAllOf", operands: ["a", ["r1", "r3"]] }, { a: ["r1", "r2"] })).toBe(false);
  expect(evalFilter({ operator: "hasAllOf", operands: ["a", ["r1", "r2"]] }, { a: ["r1", "r2"] })).toBe(true);
});
