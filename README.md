# IPL Blok AJ (Next.js + Firebase)

Pencatatan IPL (Iuran Pengelolaan Lingkungan): iuran bulanan, iuran khusus, pemasukan lain, pengeluaran,
dan halaman `/cek` untuk warga (pakai kata kunci, tanpa login).

## Setup lokal
1. Firebase Console: aktifkan **Authentication (Email/Password)** dan **Firestore**, buat akun pengurus.
2. `copy .env.local.example .env.local` lalu isi config web app Firebase.
3. `npm install` lalu `npm run dev`.

## Deploy ke Firebase Hosting
Project default ada di `.firebaserc` (`kas-rt-a7ac9`). Aplikasi di-export statis ke folder `out`.

```
npm i -g firebase-tools
firebase login
npm run deploy          # build + deploy Hosting
firebase deploy --only firestore:rules   # setiap rules berubah
```

Variabel `NEXT_PUBLIC_FIREBASE_*` dibaca saat build, jadi `.env.local` harus ada di mesin yang menjalankan `npm run deploy`.

## Data
`warga` (periode aktif, kata kunci), `tarif/{YYYY-MM}`, `transaksi`, `iuranKhusus`,
serta salinan publik `publik/{kunci}` dan `pengeluaran` untuk halaman `/cek`.
