"use client";

import { useMemo, useState } from "react";
import { useDialog } from "@/components/Dialog";
import { useData } from "@/lib/data";
import type { Warga } from "@/lib/types";
import {
  formatTanggal, isAktif, monthKey, namaBulan, namaBulanPendek, rupiah, thisMonth, today, wajibBayar,
} from "@/lib/util";

type Dlg = { w: Warga; bulan: string; wajib: boolean };

export default function IuranPage() {
  const { warga, tarif, transaksi, setTarif, bayarBulanan, batalBayar } = useData();
  const [tahun, setTahun] = useState(new Date().getFullYear());
  const [dlg, setDlg] = useState<Dlg | null>(null);
  const [jumlah, setJumlah] = useState("");
  const [tgl, setTgl] = useState(today());
  const [busy, setBusy] = useState(false);
  const { confirmBox } = useDialog();
  const [detail, setDetail] = useState<{ w: Warga; bulan: string } | null>(null);

  const [sort, setSort] = useState<{ key: "nama" | "alamat" | "grup"; dir: 1 | -1 }>({ key: "nama", dir: 1 });
  const urut = (key: "nama" | "alamat" | "grup") =>
    setSort((s) => (s.key === key ? { key, dir: s.dir === 1 ? -1 : 1 } : { key, dir: 1 }));
  const panah = (key: "nama" | "alamat" | "grup") => (sort.key === key ? (sort.dir === 1 ? " ▲" : " ▼") : "");
  const [filterGrup, setFilterGrup] = useState("");
  const [filterStatus, setFilterStatus] = useState<"" | "nunggak" | "lunas">("");
  const daftarGrup = useMemo(() => [...new Set(warga.map((w) => w.grup).filter(Boolean))].sort() as string[], [warga]);
  const sorted = useMemo(
    () =>
      warga.filter((w) => !filterGrup || (w.grup ?? "") === filterGrup).sort(
        (a, b) =>
          sort.dir *
            (a[sort.key] ?? "").localeCompare(b[sort.key] ?? "", "id", { numeric: true, sensitivity: "base" }) ||
          a.nama.localeCompare(b.nama, "id"),
      ),
    [warga, sort, filterGrup],
  );

  const bulanList = useMemo(() => Array.from({ length: 12 }, (_, i) => monthKey(tahun, i + 1)), [tahun]);
  const now = thisMonth();

  // peta pembayaran: "wargaId|bulan" -> jumlah
  const bayar = useMemo(() => {
    const m = new Map<string, { jumlah: number; tanggal: string }>();
    for (const t of transaksi)
      if (t.kategori === "bulanan" && t.wargaId && t.bulan)
        m.set(`${t.wargaId}|${t.bulan}`, { jumlah: t.jumlah, tanggal: t.tanggal });
    return m;
  }, [transaksi]);

  const tunggakan = (w: Warga) => {
    let total = 0, bulan = 0;
    for (const b of bulanList) {
      if (b > now || !wajibBayar(w, b) || bayar.has(`${w.id}|${b}`)) continue;
      total += tarif[b] ?? 0;
      bulan++;
    }
    return { total, bulan };
  };

  const tampil = sorted.filter(
    (w) => !filterStatus || (tunggakan(w).bulan > 0) === (filterStatus === "nunggak"),
  );

  const buka = (w: Warga, bulan: string) => {
    setDlg({ w, bulan, wajib: wajibBayar(w, bulan) });
    setJumlah(String(tarif[bulan] ?? ""));
    setTgl(today());
  };

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center gap-3">
        <h1 className="text-2xl font-bold">Iuran Bulanan</h1>
        <div className="flex items-center gap-2 ml-auto">
          <button className="btn-ghost" onClick={() => setTahun(tahun - 1)}>‹</button>
          <span className="font-semibold w-14 text-center">{tahun}</span>
          <button className="btn-ghost" onClick={() => setTahun(tahun + 1)}>›</button>
        </div>
      </div>

      <section className="card">
        <h2 className="font-semibold mb-1">Nominal iuran per bulan</h2>
        <p className="text-sm text-slate-500 mb-3">
          Bebas beda tiap bulan (mis. Maret 30.000, April 35.000). Simpan dengan menekan Enter / keluar dari kolom.
        </p>
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
          {bulanList.map((b, i) => (
            <label key={b} className="text-xs text-slate-600">
              {namaBulanPendek(i + 1)}
              <input
                key={`${b}-${tarif[b] ?? ""}`}
                className="input mt-1"
                type="number" min={0} step={1000} placeholder="0"
                defaultValue={tarif[b] ?? ""}
                onBlur={async (e) => {
                  const v = Number(e.target.value || 0);
                  if (v !== (tarif[b] ?? 0)) await setTarif(b, v);
                }}
                onKeyDown={(e) => e.key === "Enter" && (e.target as HTMLInputElement).blur()}
              />
            </label>
          ))}
        </div>
      </section>

      <section className="card overflow-x-auto p-0">
        <div className="px-4 pt-3 text-xs text-slate-500 flex flex-wrap items-center gap-4">
          <label className="flex items-center gap-2">Grup:
            <select className="border border-slate-300 rounded px-2 py-1 bg-white" value={filterGrup} onChange={(e) => setFilterGrup(e.target.value)}>
              <option value="">Semua</option>
              {daftarGrup.map((g) => <option key={g} value={g}>{g}</option>)}
            </select>
          </label>
          <label className="flex items-center gap-2">Status:
            <select className="border border-slate-300 rounded px-2 py-1 bg-white" value={filterStatus}
              onChange={(e) => setFilterStatus(e.target.value as "" | "nunggak" | "lunas")}>
              <option value="">Semua</option>
              <option value="nunggak">Belum bayar / menunggak</option>
              <option value="lunas">Tidak menunggak</option>
            </select>
          </label>
          <span><b className="text-emerald-700">✓</b> lunas</span>
          <span><b className="text-red-600">Bayar</b> wajib, belum bayar</span>
          <span><b className="text-slate-400">+</b> tidak wajib (nonaktif) — klik untuk bayar manual</span>
        </div>
        <table className="w-full text-center">
          <thead>
            <tr>
              <th className="th">
                <button className="uppercase font-semibold hover:text-slate-800" onClick={() => urut("nama")}>Warga{panah("nama")}</button>
              </th>
              <th className="th">
                <button className="uppercase font-semibold hover:text-slate-800" onClick={() => urut("alamat")}>Alamat{panah("alamat")}</button>
              </th>
              {bulanList.map((b, i) => <th key={b} className="th text-center">{namaBulanPendek(i + 1)}</th>)}
              <th className="th text-right">Tunggakan</th>
            </tr>
          </thead>
          <tbody>
            {tampil.map((w) => {
              const tg = tunggakan(w);
              return (
                <tr key={w.id} className="border-t border-slate-100">
                  <td className="td text-left whitespace-nowrap">
                    {w.nama}{w.pasangan ? `/${w.pasangan}` : ""}
                    {w.catatan && <span className="ml-2 text-xs italic text-amber-700" title="Catatan khusus">({w.catatan})</span>}
                    {!isAktif(w) && <span className="ml-2 text-xs text-slate-400">nonaktif</span>}
                  </td>
                  <td className="td text-left text-slate-600">{w.alamat || <span className="text-slate-300">-</span>}</td>
                  {bulanList.map((b) => {
                    const paid = bayar.get(`${w.id}|${b}`);
                    const wajib = wajibBayar(w, b);
                    return (
                      <td key={b} className="td p-1">
                        {paid !== undefined ? (
                          <button title={`${rupiah(paid.jumlah)} · ${formatTanggal(paid.tanggal)}`}
                            className="text-emerald-700 font-bold leading-tight hover:underline"
                            onClick={() => setDetail({ w, bulan: b })}>
                            ✓<span className="block text-[10px] font-normal text-slate-500">{paid.tanggal.slice(8)}/{paid.tanggal.slice(5, 7)}</span>
                          </button>
                        ) : wajib ? (
                          <button
                            className={b > now ? "text-slate-400 hover:text-emerald-700" : "text-red-600 font-semibold hover:underline"}
                            onClick={() => buka(w, b)}>
                            {b > now ? "·" : "Bayar"}
                          </button>
                        ) : (
                          <button className="text-slate-300 hover:text-emerald-700" title="Tidak wajib — tambah manual"
                            onClick={() => buka(w, b)}>+</button>
                        )}
                      </td>
                    );
                  })}
                  <td className="td text-right whitespace-nowrap">
                    {tg.bulan ? <span className="text-red-600">{rupiah(tg.total)} ({tg.bulan} bln)</span> : <span className="text-slate-400">—</span>}
                  </td>
                </tr>
              );
            })}
            {warga.length === 0 && (
              <tr><td className="td text-slate-500 text-left" colSpan={15}>Tambahkan warga dulu di menu Warga.</td></tr>
            )}
          </tbody>
        </table>
      </section>

      {detail && (() => {
        const p = bayar.get(`${detail.w.id}|${detail.bulan}`);
        return (
          <div className="fixed inset-0 bg-black/40 grid place-items-center p-4 z-10" onClick={() => setDetail(null)}>
            <div className="card w-full max-w-sm space-y-3" onClick={(e) => e.stopPropagation()}>
              <h3 className="font-semibold">Iuran {namaBulan(detail.bulan)} — {detail.w.nama}</h3>
              {p ? (
                <dl className="text-sm grid grid-cols-[auto_1fr] gap-x-4 gap-y-1">
                  <dt className="text-slate-500">Dibayar pada</dt><dd>{formatTanggal(p.tanggal)}</dd>
                  <dt className="text-slate-500">Jumlah</dt><dd>{rupiah(p.jumlah)}</dd>
                  <dt className="text-slate-500">Nominal bulan itu</dt><dd>{tarif[detail.bulan] ? rupiah(tarif[detail.bulan]) : "-"}</dd>
                </dl>
              ) : <p className="text-sm">Pembayaran tidak ditemukan.</p>}
              <div className="flex gap-2 justify-end">
                <button className="btn-ghost text-red-600" onClick={async () => {
                  if (await confirmBox("Batalkan pembayaran ini?")) { await batalBayar(detail.w, detail.bulan); setDetail(null); }
                }}>Batalkan pembayaran</button>
                <button className="btn-ghost" onClick={() => setDetail(null)}>Tutup</button>
              </div>
            </div>
          </div>
        );
      })()}

      {dlg && (
        <div className="fixed inset-0 bg-black/40 grid place-items-center p-4 z-10" onClick={() => setDlg(null)}>
          <form
            className="card w-full max-w-sm space-y-3"
            onClick={(e) => e.stopPropagation()}
            onSubmit={async (e) => {
              e.preventDefault();
              const n = Number(jumlah);
              if (!(n > 0)) return;
              setBusy(true);
              await bayarBulanan(dlg.w, dlg.bulan, n, tgl);
              setBusy(false);
              setDlg(null);
            }}
          >
            <h3 className="font-semibold">Iuran {namaBulan(dlg.bulan)} — {dlg.w.nama}</h3>
            {!dlg.wajib && (
              <p className="text-sm bg-amber-50 border border-amber-200 text-amber-800 rounded-lg p-2">
                Warga ini nonaktif pada bulan tersebut (tidak wajib). Pembayaran dicatat sebagai tambahan manual.
              </p>
            )}
            <label className="block text-sm">Jumlah (Rp)
              <input className="input mt-1" type="number" min={1} value={jumlah} autoFocus
                onChange={(e) => setJumlah(e.target.value)} required />
            </label>
            <label className="block text-sm">Tanggal diterima
              <input className="input mt-1" type="date" value={tgl} onChange={(e) => setTgl(e.target.value)} required />
            </label>
            <div className="flex gap-2 justify-end">
              <button type="button" className="btn-ghost" onClick={() => setDlg(null)}>Batal</button>
              <button className="btn" disabled={busy}>Simpan</button>
            </div>
          </form>
        </div>
      )}
    </div>
  );
}
