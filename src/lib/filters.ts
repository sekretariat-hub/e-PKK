// Evaluasi filter gaya konektor Airtable terhadap hasil REST (dijalankan di server).
export function textOf(v: any): string {
  if (v == null) return "";
  if (Array.isArray(v)) return v.map(textOf).filter(Boolean).join(", ");
  if (typeof v === "object") return v.name != null ? String(v.name) : "";
  return String(v);
}
const empty = (v: any) => v == null || v === "" || v === false || (Array.isArray(v) && v.length === 0);

export function evalFilter(f: any, fields: Record<string, any>): boolean {
  if (!f) return true;
  const op = f.operator || "and";
  if (op === "and" || op === "or") {
    const xs = (f.operands || []).filter((o: any) => o && typeof o === "object");
    if (!xs.length) return true;
    return op === "and" ? xs.every((o: any) => evalFilter(o, fields)) : xs.some((o: any) => evalFilter(o, fields));
  }
  const [fid, val] = f.operands || [];
  const v = fields[fid];
  switch (op) {
    case "isNotEmpty": return !empty(v);
    case "isEmpty": return empty(v);
    case "contains": return textOf(v).toLowerCase().includes(String(val ?? "").toLowerCase());
    case "doesNotContain": return !textOf(v).toLowerCase().includes(String(val ?? "").toLowerCase());
    case "=": return textOf(v).toLowerCase() === String(val ?? "").toLowerCase();
    case "!=": return textOf(v).toLowerCase() !== String(val ?? "").toLowerCase();
    case "hasAnyOf":
    case "hasAllOf": {
      // Field tautan: nilai berupa array id mentah atau {id,name}. Operand kedua = daftar id rekaman.
      const have = new Set((Array.isArray(v) ? v : []).map((x: any) => (x && typeof x === "object" ? x.id : x)));
      const want: any[] = Array.isArray(val) ? val : [];
      return op === "hasAnyOf" ? want.some((w) => have.has(w)) : want.length > 0 && want.every((w) => have.has(w));
    }
    default: throw new Error("operator filter tidak didukung: " + op);
  }
}
