"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState } from "react";
import { useData } from "@/lib/data";
import { firebaseReady } from "@/lib/firebase";

const NAV = [
  { href: "/", label: "Ringkasan" },
  { href: "/iuran", label: "Iuran Bulanan" },
  { href: "/khusus", label: "Iuran Khusus" },
  { href: "/transaksi", label: "IPL Masuk/Keluar" },
  { href: "/warga", label: "Warga" },
];

function Login() {
  const { login } = useData();
  const [email, setEmail] = useState("");
  const [pw, setPw] = useState("");
  const [err, setErr] = useState("");
  const [busy, setBusy] = useState(false);

  return (
    <div className="min-h-screen grid place-items-center p-4">
      <form
        className="card w-full max-w-sm space-y-3"
        onSubmit={async (e) => {
          e.preventDefault();
          setBusy(true);
          setErr("");
          try {
            await login(email, pw);
          } catch {
            setErr("Email atau password salah.");
          }
          setBusy(false);
        }}
      >
        <h1 className="text-xl font-bold">IPL Blok AJ</h1>
        <p className="text-sm text-slate-500">Masuk sebagai pengurus.</p>
        <input className="input" type="email" placeholder="Email" value={email}
          onChange={(e) => setEmail(e.target.value)} required />
        <input className="input" type="password" placeholder="Password" value={pw}
          onChange={(e) => setPw(e.target.value)} required />
        {err && <p className="text-sm text-red-600">{err}</p>}
        <button className="btn w-full" disabled={busy}>{busy ? "..." : "Masuk"}</button>
      </form>
    </div>
  );
}

export default function Shell({ children }: { children: React.ReactNode }) {
  const { user, authReady, dataReady, logout } = useData();
  const path = usePathname();

  // Halaman cek warga bersifat publik (tanpa login).
  if (path.startsWith("/cek")) return <>{children}</>;

  if (!firebaseReady) {
    return (
      <div className="min-h-screen grid place-items-center p-4">
        <div className="card max-w-md space-y-2">
          <h1 className="text-xl font-bold">Firebase belum dikonfigurasi</h1>
          <p className="text-sm">
            Salin <code>.env.local.example</code> menjadi <code>.env.local</code>, isi
            konfigurasi project Firebase, lalu jalankan ulang <code>npm run dev</code>.
          </p>
        </div>
      </div>
    );
  }
  if (!authReady) return <div className="p-8 text-slate-500">Memuat…</div>;
  if (!user) return <Login />;

  return (
    <div className="min-h-screen">
      <header className="bg-emerald-700 text-white">
        <div className="mx-auto max-w-6xl px-4 py-3 flex flex-wrap items-center gap-x-6 gap-y-2">
          <span className="font-bold text-lg">IPL Blok AJ</span>
          <nav className="flex flex-wrap gap-1 text-sm">
            {NAV.map((n) => (
              <Link key={n.href} href={n.href}
                className={`px-3 py-1.5 rounded-md ${
                  path === n.href ? "bg-white/25 font-semibold" : "hover:bg-white/10"
                }`}>
                {n.label}
              </Link>
            ))}
          </nav>
          <button onClick={logout} className="ml-auto text-sm underline opacity-90">Keluar</button>
        </div>
      </header>
      <main className="mx-auto max-w-6xl p-4">
        {dataReady ? children : <p className="text-slate-500">Memuat data…</p>}
      </main>
    </div>
  );
}
