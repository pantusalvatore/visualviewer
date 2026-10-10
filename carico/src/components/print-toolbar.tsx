"use client";

import Link from "next/link";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { Icon } from "./icon";
import { Button } from "./ui";

export function PrintToolbar({ backHref }: { backHref: string }) {
  const params = useSearchParams();
  const router = useRouter();
  const pathname = usePathname();
  const images = params.get("immagini") !== "0";
  const weeks = Number(params.get("settimane") ?? "4");

  function set(key: string, value: string) {
    const sp = new URLSearchParams(params.toString());
    sp.set(key, value);
    router.replace(`${pathname}?${sp.toString()}`, { scroll: false });
  }

  return (
    <div className="sticky top-0 z-10 border-b border-line bg-surface print:hidden">
      <div className="mx-auto flex max-w-[210mm] flex-wrap items-center gap-2 px-4 py-3">
        <Link href={backHref} className="inline-flex h-11 items-center gap-1 rounded-xl px-2 font-semibold text-muted hover:text-ink">
          <Icon name="back" size={18} /> Indietro
        </Link>
        <label className="ml-auto inline-flex h-11 cursor-pointer items-center gap-2 rounded-xl border border-line px-3 text-sm font-semibold">
          <input type="checkbox" className="size-5 accent-[var(--c-accent)]" checked={images} onChange={(e) => set("immagini", e.target.checked ? "1" : "0")} />
          Immagini
        </label>
        <label className="inline-flex h-11 items-center gap-2 rounded-xl border border-line px-3 text-sm font-semibold">
          Colonne carichi
          <select className="bg-transparent font-bold" value={weeks} onChange={(e) => set("settimane", e.target.value)} aria-label="Numero di colonne per annotare i carichi">
            {[0, 2, 3, 4, 6].map((n) => (
              <option key={n} value={n}>
                {n}
              </option>
            ))}
          </select>
        </label>
        <Button variant="primary" icon="print" onClick={() => window.print()}>
          Stampa / Salva PDF
        </Button>
      </div>
      <p className="mx-auto max-w-[210mm] px-4 pb-2 text-xs text-muted">
        Per ottenere un PDF scegli “Salva come PDF” come stampante (su iPhone: Condividi → Stampa → allarga l&apos;anteprima).
      </p>
    </div>
  );
}
