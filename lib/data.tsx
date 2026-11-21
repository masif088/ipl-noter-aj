"use client";

import {
  createContext, useCallback, useContext, useEffect, useMemo, useRef, useState,
} from "react";
import {
  onAuthStateChanged, signInWithEmailAndPassword, signOut, type User,
} from "firebase/auth";
import {
  addDoc, collection, deleteDoc, deleteField, doc, getDoc, onSnapshot, setDoc, updateDoc, writeBatch,
} from "firebase/firestore";
import { auth, db, firebaseReady } from "./firebase";
import type { IuranKhusus, Periode, Tarif, Transaksi, Warga } from "./types";
import { prevMonth, thisMonth } from "./util";

type Ctx = {
  user: User | null;
  authReady: boolean;
  dataReady: boolean;
  warga: Warga[];
  tarif: Record<string, number>;
  transaksi: Transaksi[];
  login: (email: string, password: string) => Promise<void>;
  logout: () => Promise<void>;
  tambahWarga: (nama: string, dari: string, alamat: string, pasangan: string, catatan: string, grup: string) => Promise<void>;
  ubahGrup: (id: string, grup: string) => Promise<void>;
  ubahCatatan: (id: string, catatan: string) => Promise<void>;
  ubahPasangan: (w: Warga, pasangan: string) => Promise<void>;
  ubahAlamat: (w: Warga, alamat: string) => Promise<void>;
  ubahNamaWarga: (w: Warga, nama: string) => Promise<void>;
  ubahKunci: (w: Warga, kunci: string) => Promise<void>;
  setAktif: (w: Warga, aktif: boolean) => Promise<void>;
  hapusWarga: (w: Warga) => Promise<void>;
  batalBayar: (w: Warga, bulan: string) => Promise<void>;
  setTarif: (bulan: string, jumlah: number) => Promise<void>;
  khusus: IuranKhusus[];
  buatKhusus: (d: Omit<IuranKhusus, "id">) => Promise<void>;
  ubahKhusus: (id: string, patch: Partial<Omit<IuranKhusus, "id">>) => Promise<void>;
  hapusKhusus: (k: IuranKhusus) => Promise<void>;
  bayarKhusus: (k: IuranKhusus, w: Warga, jumlah: number, tanggal: string) => Promise<void>;
  batalKhusus: (k: IuranKhusus, wargaId: string) => Promise<void>;
  bayarBulanan: (w: Warga, bulan: string, jumlah: number, tanggal: string) => Promise<void>;
  tambahTransaksi: (t: Omit<Transaksi, "id">) => Promise<void>;
  hapusTransaksi: (id: string) => Promise<void>;
};

const DataCtx = createContext<Ctx | null>(null);

export const useData = () => {
  const c = useContext(DataCtx);
  if (!c) throw new Error("useData di luar DataProvider");
  return c;
};

export const genKunci = () => {
  const abjad = "abcdefghjkmnpqrstuvwxyz23456789"; // tanpa karakter yang mirip
  const a = new Uint32Array(8);
  crypto.getRandomValues(a);
  return Array.from(a, (n) => abjad[n % abjad.length]).join("");
};

const iuranId =(wargaId: string, bulan: string) => `iuran_${wargaId}_${bulan}`;

export function DataProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [authReady, setAuthReady] = useState(!firebaseReady);
  const [warga, setWarga] = useState<Warga[]>([]);
  const [tarifList, setTarifList] = useState<Tarif[]>([]);
  const [khusus, setKhusus] = useState<IuranKhusus[]>([]);
  const [transaksi, setTransaksi] = useState<Transaksi[]>([]);
  const [loaded, setLoaded] = useState({ w: false, t: false, x: false, k: false });

  useEffect(() => {
    if (!firebaseReady) return;
    return onAuthStateChanged(auth, (u) => {
      setUser(u);
      setAuthReady(true);
    });
  }, []);

  useEffect(() => {
    if (!user) return;
    const unsubs = [
      onSnapshot(collection(db, "warga"), (s) => {
        setWarga(
          s.docs
            .map((d) => ({ id: d.id, ...(d.data() as Omit<Warga, "id">) }))
            .sort((a, b) => a.nama.localeCompare(b.nama)),
        );
        setLoaded((l) => ({ ...l, w: true }));
      }),
      onSnapshot(collection(db, "tarif"), (s) => {
        setTarifList(s.docs.map((d) => ({ id: d.id, jumlah: d.data().jumlah as number })));
        setLoaded((l) => ({ ...l, t: true }));
      }),
      onSnapshot(collection(db, "transaksi"), (s) => {
        setTransaksi(
          s.docs.map((d) => ({ id: d.id, ...(d.data() as Omit<Transaksi, "id">) })),
        );
        setLoaded((l) => ({ ...l, x: true }));
      }),
      onSnapshot(collection(db, "iuranKhusus"), (s) => {
        setKhusus(
          s.docs
            .map((d) => ({ id: d.id, ...(d.data() as Omit<IuranKhusus, "id">) }))
            .sort((a, b) => b.tanggal.localeCompare(a.tanggal)),
        );
        setLoaded((l) => ({ ...l, k: true }));
      }),
    ];
    return () => unsubs.forEach((u) => u());
  }, [user]);

  // Sekali per sesi: salin pengeluaran yang sudah ada ke koleksi publik.
  const sudahSinkronKeluar = useRef(false);
  useEffect(() => {
    if (!user || !loaded.x || sudahSinkronKeluar.current) return;
    sudahSinkronKeluar.current = true;
    for (const t of transaksi)
      if (t.tipe === "keluar")
        setDoc(doc(db, "pengeluaran", t.id), { tanggal: t.tanggal, jumlah: t.jumlah, catatan: t.catatan }).catch(() => {});
  }, [user, loaded.x, transaksi]);

  // Sekali per sesi: samakan data publik (nama, pasangan, alamat) dengan data warga,
  // termasuk warga yang dibuat sebelum kedua field itu ada.
  const sudahSinkron = useRef(false);
  useEffect(() => {
    if (!user || !loaded.w || sudahSinkron.current) return;
    sudahSinkron.current = true;
    for (const w of warga)
      if (w.kunci)
        setDoc(
          doc(db, "publik", w.kunci),
          { wargaId: w.id, nama: w.nama, alamat: w.alamat ?? "", pasangan: w.pasangan ?? "", periode: w.periode },
          { merge: true },
        ).catch(() => {});
  }, [user, loaded.w, warga]);

  const tarif = useMemo(
    () => Object.fromEntries(tarifList.map((t) => [t.id, t.jumlah])),
    [tarifList],
  );

  // Salinan data per warga untuk tampilan publik (dokumen publik/{kunci}).
  const bayarMap = useCallback(
    (wargaId: string) => {
      const m: Record<string, { jumlah: number; tanggal: string }> = {};
      for (const t of transaksi)
        if (t.kategori === "bulanan" && t.wargaId === wargaId && t.bulan)
          m[t.bulan] = { jumlah: t.jumlah, tanggal: t.tanggal };
      return m;
    },
    [transaksi],
  );

  const tambahWarga: Ctx["tambahWarga"] = useCallback(async (nama, dari, alamat, pasangan, catatan, grup) => {
    const kunci = genKunci();
    const periode = [{ dari }];
    const ref = await addDoc(collection(db, "warga"), { nama: nama.trim(), alamat: alamat.trim(), pasangan: pasangan.trim(), catatan: catatan.trim(), grup: grup.trim(), kunci, periode });
    await setDoc(doc(db, "publik", kunci), { wargaId: ref.id, nama: nama.trim(), alamat: alamat.trim(), pasangan: pasangan.trim(), periode, bayar: {} });
  }, []);

  const ubahNamaWarga: Ctx["ubahNamaWarga"] = useCallback(async (w, nama) => {
    await updateDoc(doc(db, "warga", w.id), { nama: nama.trim() });
    if (w.kunci) await setDoc(doc(db, "publik", w.kunci), { nama: nama.trim() }, { merge: true });
  }, []);

  const ubahAlamat: Ctx["ubahAlamat"] = useCallback(async (w, alamat) => {
    await updateDoc(doc(db, "warga", w.id), { alamat: alamat.trim() });
    if (w.kunci) await setDoc(doc(db, "publik", w.kunci), { alamat: alamat.trim() }, { merge: true });
  }, []);

  const ubahPasangan: Ctx["ubahPasangan"] = useCallback(async (w, pasangan) => {
    await updateDoc(doc(db, "warga", w.id), { pasangan: pasangan.trim() });
    if (w.kunci) await setDoc(doc(db, "publik", w.kunci), { pasangan: pasangan.trim() }, { merge: true });
  }, []);

  const ubahCatatan: Ctx["ubahCatatan"] = useCallback(async (id, catatan) => {
    await updateDoc(doc(db, "warga", id), { catatan: catatan.trim() });
  }, []);

  const ubahGrup: Ctx["ubahGrup"] = useCallback(async (id, grup) => {
    await updateDoc(doc(db, "warga", id), { grup: grup.trim() });
  }, []);

  const ubahKunci: Ctx["ubahKunci"] = useCallback(
    async (w, baru) => {
      const k = baru.trim().toLowerCase();
      if (!/^[a-z0-9._-]{4,40}$/.test(k))
        throw new Error("Kata kunci 4-40 karakter: huruf kecil, angka, titik, strip, garis bawah.");
      if (k === w.kunci) return;
      if ((await getDoc(doc(db, "publik", k))).exists()) throw new Error("Kata kunci sudah dipakai.");
      await setDoc(doc(db, "publik", k), {
        wargaId: w.id, nama: w.nama, alamat: w.alamat ?? "", pasangan: w.pasangan ?? "",
        periode: w.periode, bayar: bayarMap(w.id),
      });
      await updateDoc(doc(db, "warga", w.id), { kunci: k });
      if (w.kunci) await deleteDoc(doc(db, "publik", w.kunci));
    },
    [bayarMap],
  );

  // Nonaktif berlaku mulai bulan ini (bulan ini sudah tidak wajib);
  // aktif kembali berlaku mulai bulan ini.
  const setAktif: Ctx["setAktif"] = useCallback(async (w, aktif) => {
    const now = thisMonth();
    let periode: Periode[] = w.periode.map((p) => ({ ...p }));
    if (aktif) {
      periode.push({ dari: now });
    } else {
      const last = periode[periode.length - 1];
      if (last && !last.sampai) last.sampai = prevMonth(now);
      periode = periode.filter((p) => !p.sampai || p.sampai >= p.dari);
    }
    await updateDoc(doc(db, "warga", w.id), { periode });
    if (w.kunci) await setDoc(doc(db, "publik", w.kunci), { periode }, { merge: true });
  }, []);

  const hapusWarga: Ctx["hapusWarga"] = useCallback(async (w) => {
    await deleteDoc(doc(db, "warga", w.id));
    if (w.kunci) await deleteDoc(doc(db, "publik", w.kunci));
  }, []);

  const batalBayar: Ctx["batalBayar"] = useCallback(async (w, bulan) => {
    await deleteDoc(doc(db, "transaksi", iuranId(w.id, bulan)));
    if (w.kunci) await updateDoc(doc(db, "publik", w.kunci), { [`bayar.${bulan}`]: deleteField() });
  }, []);

  const setTarif: Ctx["setTarif"] = useCallback(async (bulan, jumlah) => {
    await setDoc(doc(db, "tarif", bulan), { jumlah });
  }, []);

  // ID deterministik -> satu warga hanya bisa bayar satu kali per bulan.
  const bayarBulanan: Ctx["bayarBulanan"] = useCallback(
    async (w, bulan, jumlah, tanggal) => {
      await setDoc(doc(db, "transaksi", iuranId(w.id, bulan)), {
        tipe: "masuk",
        kategori: "bulanan",
        jumlah,
        tanggal,
        catatan: "",
        wargaId: w.id,
        wargaNama: w.nama,
        bulan,
      });
      if (w.kunci)
        await setDoc(
          doc(db, "publik", w.kunci),
          { bayar: { [bulan]: { jumlah, tanggal } } },
          { merge: true },
        );
    },
    [],
  );

  const tambahTransaksi: Ctx["tambahTransaksi"] = useCallback(async (t) => {
    const ref = doc(collection(db, "transaksi"));
    await setDoc(ref, t);
    // Salinan pengeluaran untuk halaman cek warga (tanpa login).
    if (t.tipe === "keluar")
      await setDoc(doc(db, "pengeluaran", ref.id), { tanggal: t.tanggal, jumlah: t.jumlah, catatan: t.catatan });
  }, []);

  const hapusTransaksi: Ctx["hapusTransaksi"] = useCallback(async (id) => {
    await deleteDoc(doc(db, "transaksi", id));
    await deleteDoc(doc(db, "pengeluaran", id));
  }, []);

  const khususId = (kid: string, wid: string) => `khusus_${kid}_${wid}`;

  const buatKhusus: Ctx["buatKhusus"] = useCallback(async (d) => {
    await addDoc(collection(db, "iuranKhusus"), d);
  }, []);

  const ubahKhusus: Ctx["ubahKhusus"] = useCallback(async (id, patch) => {
    await updateDoc(doc(db, "iuranKhusus", id), patch);
  }, []);

  // Menghapus iuran khusus juga menghapus pembayarannya (semua dalam satu batch).
  const hapusKhusus: Ctx["hapusKhusus"] = useCallback(
    async (k) => {
      const batch = writeBatch(db);
      for (const t of transaksi) if (t.iuranId === k.id) batch.delete(doc(db, "transaksi", t.id));
      batch.delete(doc(db, "iuranKhusus", k.id));
      await batch.commit();
    },
    [transaksi],
  );

  // ID deterministik -> satu peserta hanya bisa tercatat bayar sekali per iuran khusus.
  const bayarKhusus: Ctx["bayarKhusus"] = useCallback(async (k, w, jumlah, tanggal) => {
    await setDoc(doc(db, "transaksi", khususId(k.id, w.id)), {
      tipe: "masuk", kategori: "khusus", jumlah, tanggal,
      catatan: k.nama, wargaId: w.id, wargaNama: w.nama, iuranId: k.id,
    });
  }, []);

  const batalKhusus: Ctx["batalKhusus"] = useCallback(async (k, wargaId) => {
    await deleteDoc(doc(db, "transaksi", khususId(k.id, wargaId)));
  }, []);

  const value: Ctx = {
    user, authReady,
    dataReady: loaded.w && loaded.t && loaded.x && loaded.k,
    warga, tarif, transaksi, khusus,
    login: async (e, p) => { await signInWithEmailAndPassword(auth, e, p); },
    logout: () => signOut(auth),
    tambahWarga, ubahNamaWarga, ubahAlamat, ubahPasangan, ubahCatatan, ubahGrup, ubahKunci, setAktif, hapusWarga, setTarif,
    buatKhusus, ubahKhusus, hapusKhusus, bayarKhusus, batalKhusus,
    bayarBulanan, batalBayar, tambahTransaksi, hapusTransaksi,
  };

  return <DataCtx.Provider value={value}>{children}</DataCtx.Provider>;
}
