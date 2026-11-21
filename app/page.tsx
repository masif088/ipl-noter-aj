"use client";

import { useMemo } from "react";
import { useData } from "@/lib/data";
import type { Transaksi } from "@/lib/types";
import { formatTanggal, namaBulan, rupiah } from "@/lib/util";

type Row =
  | { kind: "rekap"; key: string; bulan: string; tanggal: string; label: string; detail: string; jumlah: number }
  | { kind: "keluar"; key: string; tanggal: string; label: string; jumlah: number };

export default function Ringkasan() {
  const { transaksi, warga } = useData();

  const { masuk, keluar, saldo, rows, perBulan } = useMemo(() => {
    const masuk = transaksi.filter((t) => t.tipe === "masuk").reduce((s, t) => s + t.jumlah, 0);
    const keluar = transaksi.filter((t) => t.tipe === "keluar").reduce((s, t) => s + t.jumlah, 0);

    // Pemasukan direkap per (bulan input, kategori); pengeluaran ditampilkan satu per satu.
    const grup = new Map<string, Transaksi[]>();
    for (const t of transaksi) {
      if (t.tipe !== "masuk") continue;
      const k = `${t.tanggal.slice(0, 7)}|${t.kategori === "khusus" ? `khusus:${t.iuranId}` : t.kategori}`;
      grup.set(k, [...(grup.get(k) ?? []), t]);
    }
    const rows: Row[] = [];
    for (const [k, items] of grup) {
      const [bulan, kat] = k.split("|");
      const total = items.reduce((s, t) => s + t.jumlah, 0);
      const last = items.reduce((m, t) => (t.tanggal > m ? t.tanggal : m), "");
      rows.push({
        kind: "rekap", key: k, bulan, tanggal: last, jumlah: total,
        label:
          kat === "bulanan" ? `Iuran bulanan diterima di ${namaBulan(bulan)}`
          : kat.startsWith("khusus:") ? `Iuran khusus: ${items[0].catatan} (${namaBulan(bulan)})`
          : `Pemasukan lain ${namaBulan(bulan)}`,
        detail:
          kat === "bulanan" || kat.startsWith("khusus:")
            ? `${new Set(items.map((t) => t.wargaId)).size} warga, ${items.length} pembayaran`
            : items.map((t) => t.catatan).filter(Boolean).join(", "),
      });
    }
    for (const t of transaksi)
      if (t.tipe === "keluar")
        rows.push({ kind: "keluar", key: t.id, tanggal: t.tanggal, label: t.catatan || "Pengeluaran", jumlah: t.jumlah });
    rows.sort((a, b) => b.tanggal.localeCompare(a.tanggal));

    const pb = new Map<string, { masuk: number; keluar: number }>();
    for (const t of transaksi) {
      const b = t.tanggal.slice(0, 7);
      const cur = pb.get(b) ?? { masuk: 0, keluar: 0 };
      cur[t.tipe] += t.jumlah;
      pb.set(b, cur);
    }
    const perBulan = [...pb.entries()].sort((a, b) => b[0].localeCompare(a[0]));
    return { masuk, keluar, saldo: masuk - keluar, rows, perBulan };
  }, [transaksi]);

  const aktif = warga.filter((w) => w.periode.length && !w.periode[w.periode.length - 1].sampai).length;

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold">Ringkasan IPL</h1>

      <div className="grid gap-3 sm:grid-cols-3">
        <div className="card"><p className="text-sm text-slate-500">Saldo IPL</p>
          <p className={`text-2xl font-bold ${saldo < 0 ? "text-red-600" : ""}`}>{rupiah(saldo)}</p></div>
        <div className="card"><p className="text-sm text-slate-500">Total pemasukan</p>
          <p className="text-2xl font-bold text-emerald-700">{rupiah(masuk)}</p></div>
        <div className="card"><p className="text-sm text-slate-500">Total pengeluaran</p>
          <p className="text-2xl font-bold text-red-600">{rupiah(keluar)}</p></div>
      </div>
      <p className="text-sm text-slate-500">{aktif} warga aktif.</p>

      <div className="grid gap-6 lg:grid-cols-3">
        <section className="lg:col-span-2 space-y-2">
          <h2 className="font-semibold">Timeline (pemasukan direkap, pengeluaran per item)</h2>
          <div className="card p-0 divide-y divide-slate-100">
            {rows.map((r) => (
              <div key={r.key} className="flex items-start gap-3 px-4 py-3">
                <span className={`mt-1 h-2.5 w-2.5 rounded-full shrink-0 ${r.kind === "keluar" ? "bg-red-500" : "bg-emerald-600"}`} />
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium">{r.label}</p>
                  <p className="text-xs text-slate-500">
                    {formatTanggal(r.tanggal)}{r.kind === "rekap" && r.detail ? ` · ${r.detail}` : ""}
                  </p>
                </div>
                <p className={`text-sm font-semibold whitespace-nowrap ${r.kind === "keluar" ? "text-red-600" : "text-emerald-700"}`}>
                  {r.kind === "keluar" ? "−" : "+"} {rupiah(r.jumlah)}
                </p>
              </div>
            ))}
            {rows.length === 0 && <p className="p-4 text-sm text-slate-500">Belum ada transaksi.</p>}
          </div>
        </section>

        <section className="space-y-2">
          <h2 className="font-semibold">Rekap per bulan</h2>
          <div className="card p-0 overflow-x-auto">
            <table className="w-full">
              <thead><tr><th className="th">Bulan</th><th className="th text-right">Masuk</th><th className="th text-right">Keluar</th></tr></thead>
              <tbody>
                {perBulan.map(([b, v]) => (
                  <tr key={b} className="border-t border-slate-100">
                    <td className="td">{namaBulan(b)}</td>
                    <td className="td text-right text-emerald-700">{rupiah(v.masuk)}</td>
                    <td className="td text-right text-red-600">{rupiah(v.keluar)}</td>
                  </tr>
                ))}
                {perBulan.length === 0 && <tr><td className="td text-slate-500" colSpan={3}>—</td></tr>}
              </tbody>
            </table>
          </div>
        </section>
      </div>
    </div>
  );
}
