import Link from "next/link";
import { Icon } from "@/components/icon";
import { Logo } from "@/components/logo";
import { Weight } from "@/components/settings";
import { Card, LinkButton, SectionTitle } from "@/components/ui";
import { formatDuration } from "@/lib/progression";
import { getPlans, getSessions } from "@/lib/queries";

const dayFmt = new Intl.DateTimeFormat("it-IT", { weekday: "long", day: "numeric", month: "short" });

function startOfWeek(d: Date): Date {
  const x = new Date(d);
  x.setHours(0, 0, 0, 0);
  x.setDate(x.getDate() - ((x.getDay() + 6) % 7)); // lunedì
  return x;
}

export default async function TodayPage() {
  const [plans, sessions] = await Promise.all([getPlans(), getSessions(60)]);
  const weekStart = startOfWeek(new Date());
  const thisWeek = sessions.filter((s) => s.startedAt >= weekStart);

  // Prossimo allenamento: la scheda usata più di recente, giorno successivo all'ultimo eseguito.
  const lastSession = sessions.find((s) => s.planId && plans.some((p) => p.id === s.planId));
  const plan = (lastSession && plans.find((p) => p.id === lastSession.planId)) ?? plans[0];
  let nextDay = plan?.days[0];
  if (plan && lastSession) {
    const idx = plan.days.findIndex((d) => d.name === lastSession.dayName);
    nextDay = plan.days[(idx + 1) % plan.days.length] ?? plan.days[0];
  }

  // Settimane consecutive con almeno un allenamento.
  let streak = 0;
  for (let w = startOfWeek(new Date()); ; w.setDate(w.getDate() - 7)) {
    const end = new Date(w);
    end.setDate(end.getDate() + 7);
    const has = sessions.some((s) => s.startedAt >= w && s.startedAt < end);
    if (!has && !(streak === 0 && w.getTime() === weekStart.getTime())) break;
    if (has) streak++;
    if (streak > 52) break;
  }

  const hour = new Date().getHours();
  const greeting = hour < 12 ? "Buongiorno" : hour < 18 ? "Buon pomeriggio" : "Buonasera";

  return (
    <div className="flex flex-col gap-8">
      <header className="flex items-center justify-between lg:hidden">
        <Logo />
      </header>
      <div>
        <p className="eyebrow first-letter:uppercase">{dayFmt.format(new Date())}</p>
        <h1 className="text-[2rem] leading-tight font-black tracking-tight md:text-5xl">{greeting}.</h1>
      </div>

      <div className="grid gap-6 lg:grid-cols-[minmax(0,3fr)_minmax(0,2fr)]">
        <div className="flex flex-col gap-6">
          {plan && nextDay ? (
            <section aria-labelledby="prossimo" className="overflow-hidden rounded-3xl bg-ink text-bg">
              <div className="p-5 md:p-6">
                <p id="prossimo" className="eyebrow !text-bg/60">
                  Prossimo allenamento
                </p>
                <h2 className="mt-1 text-3xl font-black tracking-tight">{nextDay.name}</h2>
                <p className="mt-1 opacity-75">
                  {plan.name} · {nextDay.exerciseCount} esercizi
                </p>
              </div>
              <div className="flex flex-wrap gap-2 px-5 pb-5 md:px-6 md:pb-6">
                <LinkButton href={`/allenamento/${plan.id}/${nextDay.id}`} variant="primary" size="lg" icon="play" className="flex-1 sm:flex-none">
                  Inizia ora
                </LinkButton>
                <LinkButton href={`/schede/${plan.id}`} size="lg" variant="inverse">
                  Vedi scheda
                </LinkButton>
              </div>
              {plan.days.length > 1 && (
                <div className="flex gap-2 overflow-x-auto border-t border-bg/15 px-5 py-3 md:px-6">
                  {plan.days
                    .filter((d) => d.id !== nextDay.id)
                    .map((d) => (
                      <Link
                        key={d.id}
                        href={`/allenamento/${plan.id}/${d.id}`}
                        className="flex h-10 shrink-0 items-center gap-1.5 rounded-lg px-3 text-sm font-semibold opacity-80 hover:bg-bg/10 hover:opacity-100"
                      >
                        <Icon name="play" size={14} /> {d.name}
                      </Link>
                    ))}
                </div>
              )}
            </section>
          ) : (
            <section className="rounded-3xl bg-ink p-6 text-bg">
              <h2 className="text-2xl font-black">Crea la tua prima scheda</h2>
              <p className="mt-1 opacity-75">Scegli come iniziare: in un minuto sei pronto per allenarti.</p>
              <div className="mt-5 grid gap-2 sm:grid-cols-3">
                <LinkButton href="/schede/genera" variant="primary" size="lg" icon="sparkle">
                  Generatore
                </LinkButton>
                <LinkButton href="/schede" size="lg" variant="inverse">
                  Template
                </LinkButton>
                <LinkButton href="/schede/nuova" size="lg" variant="inverse">
                  Da zero
                </LinkButton>
              </div>
            </section>
          )}

          <section aria-label="Questa settimana" className="grid grid-cols-3 gap-2">
            <Card className="p-3">
              <p className="eyebrow">Settimana</p>
              <p className="text-3xl font-black tabular-nums">
                {thisWeek.length}
                <span className="text-base font-bold text-muted">/{plan?.daysPerWeek ?? 3}</span>
              </p>
            </Card>
            <Card className="p-3">
              <p className="eyebrow">Volume</p>
              <p className="truncate text-xl font-black tabular-nums sm:text-3xl">
                <Weight kg={thisWeek.reduce((n, s) => n + s.volume, 0)} />
              </p>
            </Card>
            <Card className="p-3">
              <p className="eyebrow">Costanza</p>
              <p className="text-3xl font-black tabular-nums">
                {streak}
                <span className="text-base font-bold text-muted"> sett.</span>
              </p>
            </Card>
          </section>
        </div>

        <div className="flex flex-col gap-6">
          <section aria-labelledby="recenti">
            <SectionTitle action={sessions.length > 0 ? <Link href="/storico" className="text-sm font-semibold text-accent">Tutti</Link> : undefined}>
              <span id="recenti">Ultimi allenamenti</span>
            </SectionTitle>
            {sessions.length === 0 ? (
              <p className="rounded-2xl border border-dashed border-line p-5 text-sm text-muted">Qui vedrai i tuoi allenamenti completati.</p>
            ) : (
              <ul className="flex flex-col gap-2">
                {sessions.slice(0, 4).map((s) => (
                  <li key={s.id}>
                    <Link href={`/storico/${s.id}`} className="flex items-center justify-between gap-3 rounded-2xl border border-line bg-surface p-3 hover:bg-surface-2">
                      <span className="min-w-0">
                        <span className="block truncate font-bold">{s.dayName}</span>
                        <span className="block text-sm text-muted first-letter:uppercase">{dayFmt.format(s.startedAt)}</span>
                      </span>
                      <span className="text-right text-sm text-muted tabular-nums">
                        {s.setCount} serie
                        {s.finishedAt && <span className="block">{formatDuration(s.finishedAt.getTime() - s.startedAt.getTime())}</span>}
                      </span>
                    </Link>
                  </li>
                ))}
              </ul>
            )}
          </section>
          <section aria-label="Scorciatoie" className="grid grid-cols-2 gap-2">
            <Link href="/esercizi" className="flex flex-col gap-2 rounded-2xl border border-line bg-surface p-4 hover:bg-surface-2">
              <Icon name="library" className="text-accent" />
              <span className="font-bold">Libreria esercizi</span>
            </Link>
            <Link href="/esercizi?preferiti=1" className="flex flex-col gap-2 rounded-2xl border border-line bg-surface p-4 hover:bg-surface-2">
              <Icon name="star" className="text-accent" />
              <span className="font-bold">Preferiti</span>
            </Link>
          </section>
        </div>
      </div>
    </div>
  );
}
