import type { Metadata } from "next";
import Link from "next/link";
import { LogoMark } from "@/components/logo";

export const metadata: Metadata = { title: "Offline" };

/** Pagina statica mostrata dal service worker quando non c'è connessione. */
export default function OfflinePage() {
  return (
    <main className="flex min-h-dvh flex-col items-center justify-center gap-4 p-6 text-center">
      <LogoMark size={56} />
      <h1 className="text-2xl font-black">Sei offline</h1>
      <p className="max-w-sm text-muted">
        Questa pagina non è disponibile senza connessione. Le pagine che hai già aperto restano consultabili, e un allenamento in
        corso è salvato sul telefono: potrai registrarlo appena torni online.
      </p>
      <Link href="/" className="rounded-xl bg-accent px-5 py-3 font-bold text-accent-ink">
        Riprova
      </Link>
    </main>
  );
}
