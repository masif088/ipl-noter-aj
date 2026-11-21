export type Periode = { dari: string; sampai?: string }; // "YYYY-MM"

export type Warga = {
  id: string;
  nama: string;
  alamat?: string;
  pasangan?: string;
  /** Kelompok warga (mis. Blok A, Gang Mawar). */
  grup?: string;
  /** Catatan khusus pengurus (mis. keringanan, pindah sementara). */
  catatan?: string;
  /** Kata kunci plain text; warga memakainya untuk melihat datanya sendiri tanpa login. */
  kunci?: string;
  /** Rentang bulan di mana warga ini aktif (wajib iuran bulanan). */
  periode: Periode[];
};

export type Tarif = { id: string; jumlah: number }; // id = "YYYY-MM"

export type Transaksi = {
  id: string;
  tipe: "masuk" | "keluar";
  /** bulanan = iuran wajib, lain = pemasukan lain, keluar = pengeluaran */
  kategori: "bulanan" | "khusus" | "lain" | "keluar";
  jumlah: number;
  tanggal: string; // YYYY-MM-DD
  catatan: string;
  wargaId?: string;
  wargaNama?: string;
  bulan?: string; // YYYY-MM, khusus bulanan
  iuranId?: string; // id IuranKhusus, khusus kategori "khusus"
};

/** Iuran sekali bayar di luar iuran bulanan, hanya untuk warga terpilih (peserta). */
export type IuranKhusus = {
  id: string;
  nama: string;
  jumlah: number; // per warga
  peserta: string[]; // id warga
  catatan?: string;
  tanggal: string; // tanggal dibuat YYYY-MM-DD
};
