"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Icon, type IconName } from "./icon";
import { Logo } from "./logo";
import { cx } from "./ui";

const ITEMS: { href: string; label: string; icon: IconName }[] = [
  { href: "/", label: "Oggi", icon: "home" },
  { href: "/esercizi", label: "Esercizi", icon: "library" },
  { href: "/schede", label: "Schede", icon: "plans" },
  { href: "/storico", label: "Storico", icon: "history" },
  { href: "/impostazioni", label: "Impostazioni", icon: "settings" },
];

function isActive(pathname: string, href: string) {
  return href === "/" ? pathname === "/" : pathname === href || pathname.startsWith(`${href}/`);
}

/** Barra laterale su desktop. */
export function SideNav() {
  const pathname = usePathname();
  return (
    <nav aria-label="Navigazione principale" className="sticky top-0 hidden h-dvh w-60 shrink-0 flex-col gap-1 border-r border-line px-4 py-6 lg:flex">
      <Link href="/" className="mb-6 px-2" aria-label="Carico, pagina iniziale">
        <Logo />
      </Link>
      {ITEMS.map((item) => {
        const active = isActive(pathname, item.href);
        return (
          <Link
            key={item.href}
            href={item.href}
            aria-current={active ? "page" : undefined}
            className={cx(
              "flex h-11 items-center gap-3 rounded-xl px-3 font-semibold transition",
              active ? "bg-accent-soft text-accent" : "text-muted hover:bg-surface-2 hover:text-ink",
            )}
          >
            <Icon name={item.icon} />
            {item.label}
          </Link>
        );
      })}
      <p className="mt-auto px-3 text-xs text-muted">Dati salvati in locale sul tuo computer.</p>
    </nav>
  );
}

/** Barra di navigazione in basso su mobile: raggiungibile con il pollice. */
export function BottomNav() {
  const pathname = usePathname();
  if (pathname.startsWith("/allenamento")) return null;
  return (
    <nav
      aria-label="Navigazione principale"
      className="pb-safe fixed inset-x-0 bottom-0 z-30 border-t border-line bg-surface/95 backdrop-blur lg:hidden"
    >
      <ul className="mx-auto grid max-w-lg grid-cols-5">
        {ITEMS.map((item) => {
          const active = isActive(pathname, item.href);
          return (
            <li key={item.href}>
              <Link
                href={item.href}
                aria-current={active ? "page" : undefined}
                className={cx(
                  "flex h-16 flex-col items-center justify-center gap-1 text-[0.68rem] font-semibold",
                  active ? "text-accent" : "text-muted",
                )}
              >
                <Icon name={item.icon} size={24} />
                {item.label === "Impostazioni" ? "Altro" : item.label}
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}
