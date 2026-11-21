"use client";

import { useMemo, useState } from "react";
import { useDialog } from "@/components/Dialog";
import { useData } from "@/lib/data";
import type { IuranKhusus, Warga } from "@/lib/types";
import { formatTanggal, isAktif, rupiah, today } from "@/lib/util";

const label = (w: Warga) => `${w.nama}${w.pasangan ? `/${w.pasangan}` : ""}`;

/** Pilih warga peserta. `terkunci` = peserta yang sudah bayar (tidak bisa dilepas). */
function PesertaPicker({
  warga, value, onChange, terkunci = new Set(),
}: {
  warga: Warga[];
  value: Set<string>;
  onChange: (s: Set<string>) => void;
  terkunci?: Set<string>;
}) {
  const [q, setQ] = useState("");
  const [grup, setGrup] = useState("");
  const daftarGrup = useMemo(() => [...new Set(warga.map((w) => w.grup).filter(Boolean))].sort() as string[], [warga]);
  const tampil = warga.filter(
    (w) =>
      (!grup || w.grup === grup) &&
      (!q || `${w.nama} ${w.pasangan ?? ""} ${w.alamat ?? ""}`.toLowerCase().includes(q.toLowerCase())),
  );
  const set = (ids: string[], on: boolean) => {
    const n = new Set(value);
    for (const id of ids) {
      if (on) n.add(id);
      else if (!terkunci.has(id)) n.delete(id);
    }
    onChange(n);
  };

  return (
    <div className="space-y-2">
      <div className="flex flex-wrap gap-2">
        <input className="input flex-1 min-w-40" placeholder="Cari nama / alamat…" value={q} onChange={(e) => setQ(e.target.value)} />
        <select className="input w-auto" value={grup} onChange={(e) => setGrup(e.target.value)}>
          <option value="">Semua grup</option>
          {daftarGrup.map((g) => <option key={g} value={g}>{g}</option>)}
        </select>
      </div>
      <div className="flex flex-wrap gap-2 text-xs">
        <button type="button" className="btn-ghost" onClick={() => set(tampil.map((w) => w.id), true)}>Pilih semua yang tampil</button>
        <button type="button" className="btn-ghost" onClick={() => set(warga.filter(isAktif).map((w) => w.id), true)}>Pilih semua aktif</button>
        <button type="button" className="btn-ghost" onClick={() => set(tampil.map((w) => w.id), false)}>Kosongkan yang tampil</button>
        <span className="ml-auto self-center text-slate-500">{value.size} dipilih</span>
      </div>
      <div className="max-h-64 overflow-y-auto border border-slate-200 rounded-lg divide-y divide-slate-100">
        {tampil.map((w) => (
          <label key={w.id} className="flex items-center gap-3 px-3 py-1.5 text-sm cursor-pointer hover:bg-slate-50">
            <input type="checkbox" checked={value.has(w.id)} disabled={terkunci.has(w.id)}
              onChange={(e) => set([w.id], e.target.checked)} />
            <span className="flex-1">{label(w)}{!isAktif(w) && <span className="ml-2 text-xs text-slate-400">nonaktif</span>}</span>
            <span className="text-xs text-slate-500">{[w.grup, w.alamat].filter(Boolean).join(" · ")}</span>
            {terkunci.has(w.id) && <span className="text-xs text-emerald-700">sudah bayar</span>}
          </label>
        ))}
        {tampil.length === 0 && <p className="p-3 text-sm text-slate-500">Tidak ada warga.</p>}
      </div>
    </div>
  );
}

export default function KhususPage() {
  const { khusus, warga, transaksi, buatKhusus, ubahKhusus, hapusKhusus, bayarKhusus, batalKhusus } = useData();
  const { confirmBox, alertBox } = useDialog();

  const [sel, setSel] = useState<string | null>(null);
  const [form, setForm] = useState<{ mode: "baru" | "peserta"; nama: string; jumlah: string; catatan: string; peserta: Set<string> } | null>(null);
  const [bayarDlg, setBayarDlg] = useState<{ w: Warga; jumlah: string; tgl: string } | null>(null);
  const [filter, setFilter] = useState<"" | "belum" | "sudah">("");
  const [busy, setBusy] = useState(false);

  const wargaMap = useMemo(() => new Map(warga.map((w) => [w.id, w])), [warga]);
  // iuranId|wargaId -> pembayaran
  const bayar = useMemo(() => {
    const m = new Map<string, { jumlah: number; tanggal: string }>();
    for (const t of transaksi)
      if (t.kategori === "khusus" && t.iuranId && t.wargaId) m.set(`${t.iuranId}|${t.wargaId}`, { jumlah: t.jumlah, tanggal: t.tanggal });
    return m;
  }, [transaksi]);

  const stat = (k: IuranKhusus) => {
    const lunas = k.peserta.filter((id) => bayar.has(`${k.id}|${id}`));
    const terkumpul = lunas.reduce((s, id) => s + (bayar.get(`${k.id}|${id}`)?.jumlah ?? 0), 0);
    return { lunas: lunas.length, terkumpul, target: k.peserta.length * k.jumlah };
  };

  const aktifK = khusus.find((k) => k.id === sel) ?? null;

  const rows = aktifK
    ? aktifK.peserta
        .map((id) => wargaMap.get(id))
        .filter((w): w is Warga => !!w)
        .filter((w) => {
          const p = bayar.has(`${aktifK.id}|${w.id}`);
          return !filter || (filter === "sudah") === p;
        })
        .sort((a, b) => a.nama.localeCompare(b.nama, "id"))
    : [];

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center gap-3">
        <h1 className="text-2xl font-bold">Iuran Khusus</h1>
        {aktifK && <button className="btn-ghost" onClick={() => setSel(null)}>← Semua iuran khusus</button>}
        {!aktifK && (
          <button className="btn ml-auto"
            onClick={() => setForm({ mode: "baru", nama: "", jumlah: "", catatan: "", peserta: new Set() })}>
            + Buat iuran khusus
          </button>
        )}
      </div>
      <p className="text-sm text-slate-500">
        Iuran sekali bayar di luar iuran bulanan (mis. 17 Agustusan, kerja bakti) yang hanya diikuti warga terpilih.
      </p>

      {!aktifK && (
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {khusus.map((k) => {
            const s = stat(k);
            const pct = s.target ? Math.round((s.terkumpul / s.target) * 100) : 0;
            return (
              <button key={k.id} className="card text-left hover:border-emerald-400" onClick={() => setSel(k.id)}>
                <p className="font-semibold">{k.nama}</p>
                <p className="text-xs text-slate-500">{rupiah(k.jumlah)} / warga · dibuat {formatTanggal(k.tanggal)}</p>
                <div className="h-2 bg-slate-100 rounded mt-3 overflow-hidden"><div className="h-full bg-emerald-600" style={{ width: `${pct}%` }} /></div>
                <p className="text-sm mt-2">{s.lunas}/{k.peserta.length} bayar · {rupiah(s.terkumpul)} dari {rupiah(s.target)}</p>
              </button>
            );
          })}
          {khusus.length === 0 && <p className="text-slate-500 text-sm">Belum ada iuran khusus.</p>}
        </div>
      )}

      {aktifK && (() => {
        const s = stat(aktifK);
        return (
          <>
            <div className="card flex flex-wrap items-start gap-4">
              <div>
                <h2 className="text-lg font-semibold">{aktifK.nama}</h2>
                <p className="text-sm text-slate-500">{rupiah(aktifK.jumlah)} per warga · dibuat {formatTanggal(aktifK.tanggal)}</p>
                {aktifK.catatan && <p className="text-sm mt-1">{aktifK.catatan}</p>}
              </div>
              <div className="text-sm ml-auto text-right">
                <p>{s.lunas}/{aktifK.peserta.length} sudah bayar</p>
                <p className="text-emerald-700 font-medium">Terkumpul {rupiah(s.terkumpul)}</p>
                <p className="text-red-600">Kurang {rupiah(Math.max(0, s.target - s.terkumpul))}</p>
              </div>
              <div className="w-full flex flex-wrap gap-2 items-center">
                <button className="btn-ghost" onClick={() => setForm({
                  mode: "peserta", nama: aktifK.nama, jumlah: String(aktifK.jumlah), catatan: aktifK.catatan ?? "",
                  peserta: new Set(aktifK.peserta),
                })}>Atur peserta / ubah detail</button>
                <button className="btn-ghost text-red-600" onClick={async () => {
                  if (await confirmBox(`Hapus iuran khusus "${aktifK.nama}"? ${s.lunas} pembayaran (${rupiah(s.terkumpul)}) ikut terhapus dari IPL dan tidak bisa dikembalikan.`)) {
                    await hapusKhusus(aktifK);
                    setSel(null);
                  }
                }}>Hapus iuran</button>
                <select className="input w-auto ml-auto" value={filter} onChange={(e) => setFilter(e.target.value as "" | "belum" | "sudah")}>
                  <option value="">Semua peserta</option>
                  <option value="belum">Belum bayar</option>
                  <option value="sudah">Sudah bayar</option>
                </select>
              </div>
            </div>

            <div className="card overflow-x-auto p-0">
              <table className="w-full">
                <thead><tr>
                  <th className="th">Warga</th><th className="th">Grup</th><th className="th">Alamat</th>
                  <th className="th">Status</th><th className="th" />
                </tr></thead>
                <tbody>
                  {rows.map((w) => {
                    const p = bayar.get(`${aktifK.id}|${w.id}`);
                    return (
                      <tr key={w.id} className="border-t border-slate-100">
                        <td className="td">{label(w)}</td>
                        <td className="td">{w.grup || "-"}</td>
                        <td className="td">{w.alamat || "-"}</td>
                        <td className="td">
                          {p ? <span className="text-emerald-700">Lunas {rupiah(p.jumlah)} · {formatTanggal(p.tanggal)}</span>
                             : <span className="text-red-600">Belum bayar</span>}
                        </td>
                        <td className="td text-right">
                          {p ? (
                            <button className="text-slate-400 hover:text-red-600 text-sm"
                              onClick={async () => (await confirmBox(`Batalkan pembayaran ${w.nama}?`)) && batalKhusus(aktifK, w.id)}>Batalkan</button>
                          ) : (
                            <button className="btn-ghost" onClick={() => setBayarDlg({ w, jumlah: String(aktifK.jumlah), tgl: today() })}>Bayar</button>
                          )}
                        </td>
                      </tr>
                    );
                  })}
                  {rows.length === 0 && <tr><td className="td text-slate-500" colSpan={5}>Tidak ada peserta untuk filter ini.</td></tr>}
                </tbody>
              </table>
            </div>
          </>
        );
      })()}

      {form && (
        <div className="fixed inset-0 bg-black/40 grid place-items-center p-4 z-10" onClick={() => setForm(null)}>
          <form
            className="card w-full max-w-xl space-y-3 max-h-[90vh] overflow-y-auto"
            onClick={(e) => e.stopPropagation()}
            onSubmit={async (e) => {
              e.preventDefault();
              const jumlah = Number(form.jumlah);
              if (!form.nama.trim() || !(jumlah > 0)) return;
              if (form.peserta.size === 0) return alertBox("Pilih minimal satu warga peserta.");
              setBusy(true);
              const data = { nama: form.nama.trim(), jumlah, catatan: form.catatan.trim(), peserta: [...form.peserta] };
              if (form.mode === "baru") await buatKhusus({ ...data, tanggal: today() });
              else if (aktifK) await ubahKhusus(aktifK.id, data);
              setBusy(false);
              setForm(null);
            }}
          >
            <h3 className="font-semibold">{form.mode === "baru" ? "Buat iuran khusus" : "Atur iuran khusus"}</h3>
            <div className="grid gap-3 sm:grid-cols-2">
              <label className="text-sm">Nama iuran
                <input className="input mt-1" value={form.nama} placeholder="mis. Iuran 17 Agustus" required
                  onChange={(e) => setForm({ ...form, nama: e.target.value })} />
              </label>
              <label className="text-sm">Jumlah per warga (Rp)
                <input className="input mt-1" type="number" min={1} value={form.jumlah} required
                  onChange={(e) => setForm({ ...form, jumlah: e.target.value })} />
              </label>
            </div>
            <label className="block text-sm">Catatan (opsional)
              <input className="input mt-1" value={form.catatan} onChange={(e) => setForm({ ...form, catatan: e.target.value })} />
            </label>
            <div>
              <p className="text-sm font-medium mb-1">Warga yang ikut</p>
              <PesertaPicker
                warga={warga}
                value={form.peserta}
                onChange={(peserta) => setForm({ ...form, peserta })}
                terkunci={new Set(
                  form.mode === "peserta" && aktifK ? aktifK.peserta.filter((id) => bayar.has(`${aktifK.id}|${id}`)) : [],
                )}
              />
            </div>
            <div className="flex gap-2 justify-end">
              <button type="button" className="btn-ghost" onClick={() => setForm(null)}>Batal</button>
              <button className="btn" disabled={busy}>Simpan</button>
            </div>
          </form>
        </div>
      )}

      {bayarDlg && aktifK && (
        <div className="fixed inset-0 bg-black/40 grid place-items-center p-4 z-10" onClick={() => setBayarDlg(null)}>
          <form
            className="card w-full max-w-sm space-y-3"
            onClick={(e) => e.stopPropagation()}
            onSubmit={async (e) => {
              e.preventDefault();
              const n = Number(bayarDlg.jumlah);
              if (!(n > 0)) return;
              setBusy(true);
              await bayarKhusus(aktifK, bayarDlg.w, n, bayarDlg.tgl);
              setBusy(false);
              setBayarDlg(null);
            }}
          >
            <h3 className="font-semibold">{aktifK.nama} — {bayarDlg.w.nama}</h3>
            <label className="block text-sm">Jumlah (Rp)
              <input className="input mt-1" type="number" min={1} value={bayarDlg.jumlah} autoFocus
                onChange={(e) => setBayarDlg({ ...bayarDlg, jumlah: e.target.value })} required />
            </label>
            <label className="block text-sm">Tanggal diterima
              <input className="input mt-1" type="date" value={bayarDlg.tgl}
                onChange={(e) => setBayarDlg({ ...bayarDlg, tgl: e.target.value })} required />
            </label>
            <div className="flex gap-2 justify-end">
              <button type="button" className="btn-ghost" onClick={() => setBayarDlg(null)}>Batal</button>
              <button className="btn" disabled={busy}>Simpan</button>
            </div>
          </form>
        </div>
      )}
    </div>
  );
}
