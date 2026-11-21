// Uang masuk pendaftar sebuah event = jumlah Mutasi "Transaksi Masuk" (base Bendahara) yang terhubung ke event itu dan tidak dicentang Hapus.
// Hanya baca. Penegakan hak (Bendahara, Sekjen, Koordinator, Penasihat, Superadmin) ada di route.
import { listUntil } from "./airtable";
import { BASE_BEN, KEU, T } from "./policy";

const T_EVENT_BEN = "tblBYQhtvQy6woPnJ";
const EVB = { id: "fldTFmgAlLusxT12N", bpk: "fldVvS9jO3fqwsNi6" };
const JENIS_MASUK = "Transaksi Masuk";
const esc = (s: string) => s.replace(/\\/g, "\\\\").replace(/"/g, '\\"');

export async function uangMasukEvent(eventBpkId: string): Promise<{ total: number; jumlah: number; tercatat: boolean }> {
  const evs = await listUntil(BASE_BEN, T_EVENT_BEN, { fieldIds: [EVB.id, EVB.bpk], want: Infinity, maxPages: 20 });
  const cocok = evs.records.filter((r) => Array.isArray(r.fields[EVB.bpk]) && r.fields[EVB.bpk].includes(eventBpkId));
  if (!cocok.length) return { total: 0, jumlah: 0, tercatat: false };
  const ids = new Set(cocok.map((r) => r.id));
  const nama = cocok.map((r) => String(r.fields[EVB.id] || "")).filter(Boolean);
  const dasar = `{Jenis Transaksi}="${JENIS_MASUK}",NOT({Hapus})`;
  const formula = nama.length ? `AND(${dasar},OR(${nama.map((n) => `FIND("${esc(n)}",ARRAYJOIN({Event}))`).join(",")}))` : `AND(${dasar})`;
  const { records } = await listUntil(BASE_BEN, T.mutasi, { fieldIds: [KEU.nominal, KEU.event, KEU.jenis, KEU.hapus], want: Infinity, formula, maxPages: 60 });
  let total = 0, jumlah = 0;
  for (const r of records) {
    const f = r.fields;
    const ev: string[] = Array.isArray(f[KEU.event]) ? f[KEU.event] : [];
    if (f[KEU.hapus] || !ev.some((x) => ids.has(x))) continue;
    const j = f[KEU.jenis];
    if ((j && typeof j === "object" ? j.name : j) !== JENIS_MASUK) continue;
    const n = Number(f[KEU.nominal]);
    if (!Number.isFinite(n)) continue;
    total += n; jumlah++;
  }
  return { total, jumlah, tercatat: true };
}
