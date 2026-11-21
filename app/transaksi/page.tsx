"use client";

import { useMemo, useState } from "react";
import { useDialog } from "@/components/Dialog";
import { useData } from "@/lib/data";
import { formatTanggal, namaBulan, rupiah, today } from "@/lib/util";

const JENIS = {
  bulanan: "Iuran bulanan",
  khusus: "Iuran khusus",
  lain: "Pemasukan lain",
  keluar: "Pengeluaran",
} as const;

export default function TransaksiPage() {
  const { transaksi, tambahTransaksi, hapusTransaksi } = useData();
  const { confirmBox } = useDialog();

  // form input
  const [tipe, setTipe] = useState<"lain" | "keluar">("keluar");
  const [jumlah, setJumlah] = useState("");
  const [tgl, setTgl] = useState(today());
  const [catatan, setCatatan] = useState("");
  const [busy, setBusy] = useState(false);

  // filter log
  const [bulan, setBulan] = useState(""); // YYYY-MM, kosong = semua
  const [dasar, setDasar] = useState<"tanggal" | "iuran">("tanggal");
  const [nama, setNama] = useState("");
  const [jenis, setJenis] = useState<"" | keyof typeof JENIS>("");

  const list = useMemo(() => {
    const q = nama.trim().toLowerCase();
    return transaksi
      .filter((t) => !jenis || t.kategori === jenis)
      .filter((t) => !bulan || (dasar === "iuran" ? t.bulan === bulan : t.tanggal.startsWith(bulan)))
      .filter((t) => !q || (t.wargaNama ?? "").toLowerCase().includes(q) || t.catatan.toLowerCase().includes(q))
      .sort((a, b) => b.tanggal.localeCompare(a.tanggal) || (a.wargaNama ?? "").localeCompare(b.wargaNama ?? ""));
  }, [transaksi, bulan, dasar, nama, jenis]);

  // Pagination: halaman kembali ke 1 otomatis saat filter / ukuran halaman berubah.
  const [perHal, setPerHal] = useState(10);
  const sig = [bulan, dasar, nama, jenis, perHal].join("|");
  const [hal, setHal] = useState({ sig: "", page: 1 });
  const totalHal = Math.max(1, Math.ceil(list.length / perHal));
  const page = Math.min(hal.sig === sig ? hal.page : 1, totalHal);
  const goPage = (p: number) => setHal({ sig, page: Math.min(Math.max(1, p), totalHal) });
  const tampil = list.slice((page - 1) * perHal, page * perHal);

  const masuk = list.filter((t) => t.tipe === "masuk").reduce((s, t) => s + t.jumlah, 0);
  const keluar = list.filter((t) => t.tipe === "keluar").reduce((s, t) => s + t.jumlah, 0);

  return (
    <div className="space-y-4">
      <h1 className="text-2xl font-bold">IPL Masuk / Keluar</h1>
      <p className="text-sm text-slate-500">
        Input pemasukan lain (donasi, dll) dan pengeluaran. Iuran bulanan dicatat di menu Iuran Bulanan, iuran khusus di menu Iuran Khusus; semuanya tetap tampil di daftar di bawah.
      </p>

      <form
        className="card grid gap-3 sm:grid-cols-2 lg:grid-cols-5 items-end"
        onSubmit={async (e) => {
          e.preventDefault();
          const n = Number(jumlah);
          if (!(n > 0)) return;
          setBusy(true);
          await tambahTransaksi({
            tipe: tipe === "keluar" ? "keluar" : "masuk",
            kategori: tipe,
            jumlah: n,
            tanggal: tgl,
            catatan: catatan.trim(),
          });
          setJumlah("");
          setCatatan("");
          setBusy(false);
        }}
      >
        <label className="text-sm">Jenis
          <select className="input mt-1" value={tipe} onChange={(e) => setTipe(e.target.value as "lain" | "keluar")}>
            <option value="keluar">Pengeluaran</option>
            <option value="lain">Pemasukan lain</option>
          </select>
        </label>
        <label className="text-sm">Jumlah (Rp)
          <input className="input mt-1" type="number" min={1} value={jumlah} onChange={(e) => setJumlah(e.target.value)} required />
        </label>
        <label className="text-sm">Tanggal
          <input className="input mt-1" type="date" value={tgl} onChange={(e) => setTgl(e.target.value)} required />
        </label>
        <label className="text-sm">Keterangan
          <input className="input mt-1" value={catatan} onChange={(e) => setCatatan(e.target.value)} placeholder="mis. Beli lampu jalan" required />
        </label>
        <button className="btn" disabled={busy}>Simpan</button>
      </form>

      <h2 className="font-semibold pt-2">Daftar transaksi</h2>

      <div className="card grid gap-3 sm:grid-cols-2 lg:grid-cols-5 items-end">
        <label className="text-sm">Bulan
          <input type="month" className="input mt-1" value={bulan} onChange={(e) => setBulan(e.target.value)} />
        </label>
        <label className="text-sm">Bulan berdasarkan
          <select className="input mt-1" value={dasar} onChange={(e) => setDasar(e.target.value as "tanggal" | "iuran")}>
            <option value="tanggal">Tanggal bayar/transaksi</option>
            <option value="iuran">Bulan iuran yang dibayar</option>
          </select>
        </label>
        <label className="text-sm">Nama warga / keterangan
          <input className="input mt-1" placeholder="Cari nama…" value={nama} onChange={(e) => setNama(e.target.value)} />
        </label>
        <label className="text-sm">Jenis
          <select className="input mt-1" value={jenis} onChange={(e) => setJenis(e.target.value as "" | keyof typeof JENIS)}>
            <option value="">Semua</option>
            {Object.entries(JENIS).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
          </select>
        </label>
        <button className="btn-ghost" onClick={() => { setBulan(""); setNama(""); setJenis(""); setDasar("tanggal"); }}>
          Reset filter
        </button>
      </div>

      <div className="flex flex-wrap gap-x-6 gap-y-1 text-sm">
        <span>{list.length} transaksi</span>
        <span className="text-emerald-700">Masuk: {rupiah(masuk)}</span>
        <span className="text-red-600">Keluar: {rupiah(keluar)}</span>
        <span className="font-medium">Selisih: {rupiah(masuk - keluar)}</span>
      </div>

      <div className="card overflow-x-auto p-0">
        <table className="w-full">
          <thead>
            <tr>
              <th className="th">Tanggal</th>
              <th className="th">Jenis</th>
              <th className="th">Warga</th>
              <th className="th">Untuk bulan</th>
              <th className="th">Keterangan</th>
              <th className="th text-right">Jumlah</th>
              <th className="th" />
            </tr>
          </thead>
          <tbody>
            {tampil.map((t) => (
              <tr key={t.id} className="border-t border-slate-100">
                <td className="td whitespace-nowrap">{formatTanggal(t.tanggal)}</td>
                <td className="td whitespace-nowrap">{JENIS[t.kategori]}</td>
                <td className="td">{t.wargaNama ?? "-"}</td>
                <td className="td whitespace-nowrap">{t.bulan ? namaBulan(t.bulan) : "-"}</td>
                <td className="td">{t.catatan || "-"}</td>
                <td className={`td text-right font-medium whitespace-nowrap ${t.tipe === "masuk" ? "text-emerald-700" : "text-red-600"}`}>
                  {t.tipe === "masuk" ? "+" : "−"} {rupiah(t.jumlah)}
                </td>
                <td className="td text-right">
                  {/* iuran bulanan/khusus dibatalkan lewat menu masing-masing */}
                  {(t.kategori === "lain" || t.kategori === "keluar") && (
                    <button className="text-slate-400 hover:text-red-600 text-sm"
                      onClick={async () => (await confirmBox("Hapus transaksi ini?")) && hapusTransaksi(t.id)}>Hapus</button>
                  )}
                </td>
              </tr>
            ))}
            {list.length === 0 && <tr><td className="td text-slate-500" colSpan={7}>Tidak ada data untuk filter ini.</td></tr>}
          </tbody>
        </table>
        {list.length > 0 && (
          <div className="flex flex-wrap items-center gap-3 border-t border-slate-100 px-4 py-3 text-sm">
            <span className="text-slate-500">
              {(page - 1) * perHal + 1}–{Math.min(page * perHal, list.length)} dari {list.length}
            </span>
            <label className="flex items-center gap-2 text-slate-500">Per halaman
              <select className="border border-slate-300 rounded px-2 py-1 bg-white" value={perHal}
                onChange={(e) => setPerHal(Number(e.target.value))}>
                {[10, 25, 50, 100].map((n) => <option key={n} value={n}>{n}</option>)}
              </select>
            </label>
            <div className="ml-auto flex items-center gap-2">
              <button className="btn-ghost" disabled={page <= 1} onClick={() => goPage(1)}>«</button>
              <button className="btn-ghost" disabled={page <= 1} onClick={() => goPage(page - 1)}>‹</button>
              <span>Hal {page} / {totalHal}</span>
              <button className="btn-ghost" disabled={page >= totalHal} onClick={() => goPage(page + 1)}>›</button>
              <button className="btn-ghost" disabled={page >= totalHal} onClick={() => goPage(totalHal)}>»</button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
