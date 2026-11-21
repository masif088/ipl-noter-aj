"use client";

import { useEffect, useState } from "react";
import { collection, doc, getDoc, getDocs } from "firebase/firestore";
import { db } from "@/lib/firebase";
import type { Periode } from "@/lib/types";
import {
  formatTanggal, monthKey, namaBulanPendek, rupiah, thisMonth, wajibBayar,
} from "@/lib/util";

type Publik = {
  nama: string;
  pasangan?: string;
  alamat?: string;
  periode: Periode[];
  bayar?: Record<string, { jumlah: number; tanggal: string }>;
};

export default function Cek() {
  const [kunci, setKunci] = useState(() => new URLSearchParams(location.search).get("k") ?? "");
  const [data, setData] = useState<Publik | null>(null);
  const [tarif, setTarif] = useState<Record<string, number>>({});
  const [keluar, setKeluar] = useState<{ id: string; tanggal: string; jumlah: number; catatan: string }[]>([]);
  const [err, setErr] = useState("");
  const [busy, setBusy] = useState(false);
  const [tahun, setTahun] = useState(new Date().getFullYear());

  const cari = async (k: string) => {
    k = k.trim().toLowerCase();
    if (!k) return;
    setBusy(true);
    setErr("");
    setData(null);
    try {
      const snap = await getDoc(doc(db, "publik", k));
      if (!snap.exists()) {
        setErr("Kata kunci tidak ditemukan.");
      } else {
        setData(snap.data() as Publik);
        const t = await getDocs(collection(db, "tarif"));
        setTarif(Object.fromEntries(t.docs.map((d) => [d.id, d.data().jumlah as number])));
        const p = await getDocs(collection(db, "pengeluaran"));
        setKeluar(
          p.docs
            .map((d) => ({ id: d.id, ...(d.data() as { tanggal: string; jumlah: number; catatan: string }) }))
            .sort((a, b) => b.tanggal.localeCompare(a.tanggal)),
        );
      }
    } catch {
      setErr("Gagal memuat data. Coba lagi.");
    }
    setBusy(false);
  };

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    if (kunci) cari(kunci);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const now = thisMonth();
  const keluarTahun = keluar.filter((k) => k.tanggal.startsWith(`${tahun}-`));
  const bulanList = Array.from({ length: 12 }, (_, i) => monthKey(tahun, i + 1));
  const bayar = data?.bayar ?? {};
  const tunggakan = data
    ? bulanList.filter((b) => b <= now && wajibBayar({ id: "", nama: "", periode: data.periode }, b) && !bayar[b])
    : [];

  return (
    <div className="mx-auto max-w-2xl p-4 space-y-4">
      <div>
        <h1 className="text-2xl font-bold text-emerald-800">Cek IPL Blok AJ</h1>
        <p className="text-sm text-slate-500">Iuran Pengelolaan Lingkungan</p>
      </div>
      <form className="card flex gap-2" onSubmit={(e) => { e.preventDefault(); cari(kunci); }}>
        <input className="input" placeholder="Masukkan kata kunci Anda" value={kunci}
          onChange={(e) => setKunci(e.target.value)} />
        <button className="btn" disabled={busy}>{busy ? "..." : "Cek"}</button>
      </form>
      {err && <p className="text-red-600 text-sm">{err}</p>}

      {data && (
        <section className="card space-y-3">
          <div className="flex items-center gap-2">
            <div>
              <h2 className="font-semibold text-lg">{data.nama}{data.pasangan ? `/${data.pasangan}` : ""}</h2>
              {data.alamat && <p className="text-sm text-slate-500">{data.alamat}</p>}
            </div>
            <div className="ml-auto flex items-center gap-2">
              <button className="btn-ghost" onClick={() => setTahun(tahun - 1)}>‹</button>
              <span className="font-semibold">{tahun}</span>
              <button className="btn-ghost" onClick={() => setTahun(tahun + 1)}>›</button>
            </div>
          </div>
          <table className="w-full">
            <thead><tr><th className="th">Bulan</th><th className="th">Iuran</th><th className="th">Status</th></tr></thead>
            <tbody>
              {bulanList.map((b, i) => {
                const p = bayar[b];
                const wajib = wajibBayar({ id: "", nama: "", periode: data.periode }, b);
                return (
                  <tr key={b} className="border-t border-slate-100">
                    <td className="td">{namaBulanPendek(i + 1)}</td>
                    <td className="td">{tarif[b] ? rupiah(tarif[b]) : "-"}</td>
                    <td className="td">
                      {p ? (
                        <span className="text-emerald-700">Lunas {rupiah(p.jumlah)} · {formatTanggal(p.tanggal)}</span>
                      ) : !wajib ? (
                        <span className="text-slate-400">Tidak wajib</span>
                      ) : b > now ? (
                        <span className="text-slate-400">Belum jatuh tempo</span>
                      ) : (
                        <span className="text-red-600">Belum bayar</span>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
          <p className="text-sm">
            {tunggakan.length
              ? <>Tunggakan tahun {tahun}: <b className="text-red-600">{rupiah(tunggakan.reduce((s, b) => s + (tarif[b] ?? 0), 0))}</b> ({tunggakan.length} bulan)</>
              : <span className="text-emerald-700">Tidak ada tunggakan tahun {tahun}.</span>}
          </p>
        </section>
      )}

      {data && (
        <section className="card space-y-3">
          <h2 className="font-semibold text-lg">Pengeluaran IPL {tahun}</h2>
          {keluarTahun.length === 0 ? (
            <p className="text-sm text-slate-500">Belum ada pengeluaran di tahun {tahun}.</p>
          ) : (
            <>
              <table className="w-full">
                <thead><tr><th className="th">Tanggal</th><th className="th">Keterangan</th><th className="th text-right">Jumlah</th></tr></thead>
                <tbody>
                  {keluarTahun.map((k) => (
                    <tr key={k.id} className="border-t border-slate-100">
                      <td className="td whitespace-nowrap">{formatTanggal(k.tanggal)}</td>
                      <td className="td">{k.catatan || "-"}</td>
                      <td className="td text-right whitespace-nowrap text-red-600">{rupiah(k.jumlah)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </>
          )}
        </section>
      )}
    </div>
  );
}
