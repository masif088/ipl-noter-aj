"use client";

import dynamic from "next/dynamic";

// Halaman ini membaca URL & tanggal di browser, jadi tidak di-prerender.
const Cek = dynamic(() => import("./Cek"), { ssr: false });

export default function CekPage() {
  return <Cek />;
}
