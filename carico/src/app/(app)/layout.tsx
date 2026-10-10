import { BottomNav, SideNav } from "@/components/nav";

// Tutte le pagine leggono dal database locale: niente pre-rendering statico.
export const dynamic = "force-dynamic";

export default function AppLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex min-h-dvh">
      <a
        href="#contenuto"
        className="sr-only focus:not-sr-only focus:fixed focus:top-2 focus:left-2 focus:z-50 focus:rounded-lg focus:bg-accent focus:px-4 focus:py-2 focus:text-accent-ink"
      >
        Vai al contenuto
      </a>
      <SideNav />
      <main id="contenuto" className="min-w-0 flex-1 px-4 pt-5 pb-28 md:px-8 lg:pt-8 lg:pb-12">
        <div className="mx-auto max-w-6xl">{children}</div>
      </main>
      <BottomNav />
    </div>
  );
}
