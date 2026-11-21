"use client";

import { useState } from "react";
import { useDialog } from "@/components/Dialog";
import { useData } from "@/lib/data";
import { isAktif, namaBulan, thisMonth } from "@/lib/util";

export default function WargaPage() {
  const { warga, tambahWarga, ubahNamaWarga, ubahAlamat, ubahPasangan, ubahCatatan, ubahGrup, ubahKunci, setAktif, hapusWarga, transaksi } = useData();
  const { confirmBox, promptBox, alertBox } = useDialog();
  const [nama, setNama] = useState("");
  const [alamat, setAlamat] = useState("");
  const [pasangan, setPasangan] = useState("");
  const [catatan, setCatatan] = useState("");
  const [grup, setGrup] = useState("");
  const daftarGrup = [...new Set(warga.map((w) => w.grup).filter(Boolean))] as string[];
  const [dari, setDari] = useState(thisMonth());
  const [edit, setEdit] = useState<{ id: string; nama: string } | null>(null);

  const aktifCount = warga.filter(isAktif).length;

  return (
    <div className="space-y-4">
      <h1 className="text-2xl font-bold">Warga</h1>

      <form
        className="card flex flex-wrap gap-3 items-end"
        onSubmit={async (e) => {
          e.preventDefault();
          if (!nama.trim()) return;
          await tambahWarga(nama, dari, alamat, pasangan, catatan, grup);
          setGrup("");
          setCatatan("");
          setNama("");
          setPasangan("");
          setAlamat("");
        }}
      >
        <label className="flex-1 min-w-48 text-sm">
          Nama warga
          <input className="input mt-1" value={nama} onChange={(e) => setNama(e.target.value)} required />
        </label>
        <label className="flex-1 min-w-48 text-sm">
          Nama pasangan
          <input className="input mt-1" value={pasangan} placeholder="Kosongkan jika tidak ada" onChange={(e) => setPasangan(e.target.value)} />
        </label>
        <label className="flex-1 min-w-48 text-sm">
          Alamat
          <input className="input mt-1" value={alamat} placeholder="mis. Blok C No. 12" onChange={(e) => setAlamat(e.target.value)} />
        </label>
        <label className="flex-1 min-w-40 text-sm">
          Grup
          <input className="input mt-1" list="daftar-grup" value={grup} placeholder="mis. Blok A" onChange={(e) => setGrup(e.target.value)} />
          <datalist id="daftar-grup">{daftarGrup.map((g) => <option key={g} value={g} />)}</datalist>
        </label>
        <label className="flex-1 min-w-48 text-sm">
          Catatan khusus
          <input className="input mt-1" value={catatan} placeholder="Opsional" onChange={(e) => setCatatan(e.target.value)} />
        </label>
        <label className="text-sm">
          Wajib iuran mulai bulan
          <input type="month" className="input mt-1" value={dari} onChange={(e) => setDari(e.target.value)} required />
        </label>
        <button className="btn">Tambah</button>
      </form>

      <div className="card overflow-x-auto p-0">
        <p className="px-4 pt-3 text-sm text-slate-500">
          {aktifCount} aktif dari {warga.length} warga. Warga nonaktif tidak wajib iuran bulanan,
          tetapi tetap bisa membayar manual di menu Iuran Bulanan.
        </p>
        <table className="w-full">
          <thead>
            <tr><th className="th">Nama</th><th className="th">Pasangan</th><th className="th">Grup</th><th className="th">Alamat</th><th className="th">Catatan khusus</th><th className="th">Status</th><th className="th">Kata kunci (cek tanpa login)</th><th className="th" /></tr>
          </thead>
          <tbody>
            {warga.map((w) => {
              const aktif = isAktif(w);
              const last = w.periode[w.periode.length - 1];
              return (
                <tr key={w.id} className="border-t border-slate-100">
                  <td className="td">
                    {edit?.id === w.id ? (
                      <input className="input" autoFocus value={edit.nama}
                        onChange={(e) => setEdit({ id: w.id, nama: e.target.value })}
                        onBlur={async () => {
                          if (edit.nama.trim()) await ubahNamaWarga(w, edit.nama);
                          setEdit(null);
                        }}
                        onKeyDown={(e) => e.key === "Enter" && (e.target as HTMLInputElement).blur()} />
                    ) : (
                      <button className="text-left hover:underline" onClick={() => setEdit({ id: w.id, nama: w.nama })}>
                        {w.nama}
                      </button>
                    )}
                  </td>
                  <td className="td">
                    <button className="text-left hover:underline" title="Klik untuk ubah nama pasangan"
                      onClick={async () => {
                        const v = await promptBox("Nama pasangan " + w.nama, w.pasangan ?? "");
                        if (v !== null) await ubahPasangan(w, v);
                      }}>
                      {w.pasangan || <span className="text-slate-400">+ pasangan</span>}
                    </button>
                  </td>
                  <td className="td">
                    <button className="text-left hover:underline" title="Klik untuk ubah grup"
                      onClick={async () => {
                        const v = await promptBox("Grup " + w.nama, w.grup ?? "");
                        if (v !== null) await ubahGrup(w.id, v);
                      }}>
                      {w.grup || <span className="text-slate-400">+ grup</span>}
                    </button>
                  </td>
                  <td className="td">
                    <button className="text-left hover:underline" title="Klik untuk ubah alamat"
                      onClick={async () => {
                        const v = await promptBox("Alamat " + w.nama, w.alamat ?? "");
                        if (v !== null) await ubahAlamat(w, v);
                      }}>
                      {w.alamat || <span className="text-slate-400">+ alamat</span>}
                    </button>
                  </td>
                  <td className="td">
                    <button className="text-left hover:underline" title="Klik untuk ubah catatan"
                      onClick={async () => {
                        const v = await promptBox("Catatan khusus " + w.nama, w.catatan ?? "");
                        if (v !== null) await ubahCatatan(w.id, v);
                      }}>
                      {w.catatan || <span className="text-slate-400">+ catatan</span>}
                    </button>
                  </td>
                  <td className="td">
                    {aktif ? (
                      <span className="text-emerald-700">Aktif sejak {namaBulan(last.dari)}</span>
                    ) : (
                      <span className="text-slate-500">
                        Nonaktif{last?.sampai ? ` (terakhir wajib ${namaBulan(last.sampai)})` : ""}
                      </span>
                    )}
                  </td>
                  <td className="td whitespace-nowrap">
                    <code className="bg-slate-100 rounded px-1.5 py-0.5">{w.kunci ?? "—"}</code>
                    <button className="ml-2 text-xs text-emerald-700 hover:underline"
                      onClick={async () => {
                        const v = await promptBox("Kata kunci untuk " + w.nama, w.kunci ?? "");
                        if (v === null) return;
                        try { await ubahKunci(w, v); } catch (e) { await alertBox((e as Error).message); }
                      }}>ubah</button>
                    {w.kunci && (
                      <button className="ml-2 text-xs text-emerald-700 hover:underline"
                        onClick={() => navigator.clipboard.writeText(`${location.origin}/cek?k=${w.kunci}`)}>
                        salin link
                      </button>
                    )}
                  </td>
                  <td className="td text-right space-x-2 whitespace-nowrap">
                    <button className="btn-ghost" onClick={() => setAktif(w, !aktif)}>
                      {aktif ? "Nonaktifkan" : "Aktifkan"}
                    </button>
                    <button className="btn-ghost text-red-600"
                      onClick={async () => {
                        const punya = transaksi.some((t) => t.wargaId === w.id);
                        const msg = punya
                          ? `${w.nama} punya riwayat pembayaran. Riwayat IPL tetap tersimpan, hanya data warga dihapus. Lanjut?`
                          : `Hapus ${w.nama}?`;
                        if (await confirmBox(msg)) await hapusWarga(w);
                      }}>
                      Hapus
                    </button>
                  </td>
                </tr>
              );
            })}
            {warga.length === 0 && (
              <tr><td className="td text-slate-500" colSpan={8}>Belum ada warga.</td></tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
