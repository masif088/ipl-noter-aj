import type { Warga } from "./types";

const BULAN = [
  "Januari", "Februari", "Maret", "April", "Mei", "Juni",
  "Juli", "Agustus", "September", "Oktober", "November", "Desember",
];

export const rupiah = (n: number) =>
  "Rp " + Math.round(n).toLocaleString("id-ID");

export const pad = (n: number) => String(n).padStart(2, "0");

export const today = () => {
  const d = new Date();
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
};

export const thisMonth = () => today().slice(0, 7);

export const monthKey = (year: number, month1: number) => `${year}-${pad(month1)}`;

export const prevMonth = (key: string) => {
  const [y, m] = key.split("-").map(Number);
  return m === 1 ? monthKey(y - 1, 12) : monthKey(y, m - 1);
};

export const namaBulan = (key: string) => {
  const [y, m] = key.split("-").map(Number);
  return `${BULAN[m - 1]} ${y}`;
};

export const namaBulanPendek = (m1: number) => BULAN[m1 - 1].slice(0, 3);

/** Apakah warga wajib iuran pada bulan tersebut? */
export const wajibBayar = (w: Warga, bulan: string) =>
  w.periode.some((p) => bulan >= p.dari && (!p.sampai || bulan <= p.sampai));

export const isAktif = (w: Warga) =>
  w.periode.length > 0 && !w.periode[w.periode.length - 1].sampai;

export const formatTanggal = (iso: string) => {
  const [y, m, d] = iso.split("-").map(Number);
  return `${d} ${BULAN[m - 1].slice(0, 3)} ${y}`;
};
