import type { Metadata } from "next";
import Link from "next/link";
import { ImportPlanButton } from "@/components/import-plan";
import { Icon } from "@/components/icon";
import { Badge, Card, EmptyState, LinkButton, PageHeader, SectionTitle } from "@/components/ui";
import { GOAL_LABELS, LEVEL_LABELS } from "@/lib/domain";
import { getPlans } from "@/lib/queries";
import { PLAN_TEMPLATES } from "@/lib/templates";

export const metadata: Metadata = { title: "Schede" };

const dateFmt = new Intl.DateTimeFormat("it-IT", { day: "numeric", month: "short" });

export default async function PlansPage() {
  const plans = await getPlans();
  return (
    <>
      <PageHeader
        eyebrow="Le tue schede"
        title="Schede"
        actions={
          <LinkButton href="/schede/nuova" variant="primary" icon="plus">
            <span className="hidden sm:inline">Nuova scheda</span>
            <span className="sm:hidden">Nuova</span>
          </LinkButton>
        }
      />

      <div className="grid gap-8 lg:grid-cols-[minmax(0,3fr)_minmax(0,2fr)]">
        <section aria-labelledby="mie-schede">
          <SectionTitle action={<ImportPlanButton />}>
            <span id="mie-schede">Salvate · {plans.length}</span>
          </SectionTitle>
          {plans.length === 0 ? (
            <EmptyState
              icon="plans"
              title="Ancora nessuna scheda"
              action={
                <div className="flex flex-wrap justify-center gap-2">
                  <LinkButton href="/schede/genera" variant="primary" icon="sparkle">
                    Generala in automatico
                  </LinkButton>
                  <LinkButton href="/schede/nuova" icon="plus">
                    Crea da zero
                  </LinkButton>
                </div>
              }
            >
              Parti da un template, fatti proporre una scheda dal generatore o costruiscila da zero.
            </EmptyState>
          ) : (
            <ul className="flex flex-col gap-3">
              {plans.map((p) => (
                <li key={p.id}>
                  <Card className="overflow-hidden">
                    <Link href={`/schede/${p.id}`} className="flex items-start gap-3 p-4 hover:bg-surface-2/60">
                      <div className="min-w-0 flex-1">
                        <h3 className="truncate text-lg font-extrabold">{p.name}</h3>
                        <div className="mt-1.5 flex flex-wrap gap-1.5">
                          <Badge tone="accent">{GOAL_LABELS[p.goal]}</Badge>
                          <Badge>{LEVEL_LABELS[p.level]}</Badge>
                          <Badge>{p.daysPerWeek}× / settimana</Badge>
                        </div>
                        <p className="mt-2 text-sm text-muted">
                          {p.lastSession ? `Ultimo allenamento: ${dateFmt.format(p.lastSession.startedAt)}` : "Mai eseguita"}
                        </p>
                      </div>
                      <Icon name="chevron" className="mt-1 text-muted" />
                    </Link>
                    <div className="flex gap-2 overflow-x-auto border-t border-line p-2">
                      {p.days.map((d) => (
                        <LinkButton
                          key={d.id}
                          href={`/allenamento/${p.id}/${d.id}`}
                          size="sm"
                          variant="secondary"
                          icon="play"
                          aria-label={`Inizia ${d.name}`}
                        >
                          {d.name}
                        </LinkButton>
                      ))}
                    </div>
                  </Card>
                </li>
              ))}
            </ul>
          )}
        </section>

        <aside className="flex flex-col gap-6">
          <Link
            href="/schede/genera"
            className="group flex items-center gap-4 rounded-2xl bg-ink p-5 text-bg transition hover:brightness-110"
          >
            <span className="flex size-12 shrink-0 items-center justify-center rounded-xl bg-accent text-accent-ink">
              <Icon name="sparkle" size={26} />
            </span>
            <span className="flex-1">
              <span className="block text-lg font-extrabold">Generatore automatico</span>
              <span className="block text-sm opacity-75">Obiettivo, livello, giorni e attrezzatura: al resto pensa Carico.</span>
            </span>
            <Icon name="chevron" />
          </Link>

          <section aria-labelledby="template">
            <SectionTitle>
              <span id="template">Template pronti</span>
            </SectionTitle>
            <ul className="flex flex-col gap-2">
              {PLAN_TEMPLATES.map((t) => (
                <li key={t.id}>
                  <Link
                    href={`/schede/nuova?template=${t.id}`}
                    className="flex items-start gap-3 rounded-2xl border border-line bg-surface p-4 hover:bg-surface-2"
                  >
                    <span className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-accent-soft font-black text-accent">
                      {t.plan.days.length}
                    </span>
                    <span className="min-w-0 flex-1">
                      <span className="block font-bold">{t.title}</span>
                      <span className="block text-sm text-muted">{t.description}</span>
                    </span>
                    <Icon name="chevron" className="mt-2 shrink-0 text-muted" />
                  </Link>
                </li>
              ))}
            </ul>
          </section>
        </aside>
      </div>
    </>
  );
}
