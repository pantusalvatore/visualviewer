"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { deletePlan, duplicatePlan } from "@/lib/actions/plans";
import type { PlanExport } from "@/lib/plan-schema";
import { encodeShare } from "@/lib/share";
import { Icon, type IconName } from "./icon";
import { cx } from "./ui";

function ActionTile({
  icon,
  label,
  onClick,
  href,
  danger,
  download,
}: {
  icon: IconName;
  label: string;
  onClick?: () => void;
  href?: string;
  danger?: boolean;
  download?: boolean;
}) {
  const cls = cx(
    "flex min-h-16 flex-col items-center justify-center gap-1 rounded-xl border border-line bg-surface px-2 py-2 text-xs font-semibold hover:bg-surface-2",
    danger && "text-danger",
  );
  return href ? (
    <a href={href} className={cls} download={download || undefined}>
      <Icon name={icon} />
      {label}
    </a>
  ) : (
    <button type="button" className={cls} onClick={onClick}>
      <Icon name={icon} />
      {label}
    </button>
  );
}

export function PlanActions({ planId, exportData }: { planId: string; exportData: PlanExport }) {
  const router = useRouter();
  const [message, setMessage] = useState<string | null>(null);
  const [pending, start] = useTransition();

  async function share() {
    const code = await encodeShare(exportData);
    const url = `${window.location.origin}/condividi#${code}`;
    try {
      if (navigator.share) {
        await navigator.share({ title: exportData.plan.name, text: `Scheda “${exportData.plan.name}” da Carico`, url });
        return;
      }
    } catch {
      // Condivisione annullata: ripieghiamo sugli appunti.
    }
    try {
      await navigator.clipboard.writeText(url);
      setMessage("Link copiato negli appunti.");
    } catch {
      window.prompt("Copia il link della scheda:", url);
    }
  }

  return (
    <div className="flex flex-col gap-2">
      <div className="grid grid-cols-3 gap-2 sm:grid-cols-6" aria-busy={pending}>
        <ActionTile icon="edit" label="Modifica" onClick={() => router.push(`/schede/${planId}/modifica`)} />
        <ActionTile
          icon="copy"
          label="Duplica"
          onClick={() =>
            start(async () => {
              const res = await duplicatePlan(planId);
              if (res.ok) router.push(`/schede/${res.data.id}`);
              else setMessage(res.error);
            })
          }
        />
        <ActionTile icon="print" label="PDF / Stampa" onClick={() => router.push(`/stampa/${planId}`)} />
        <ActionTile icon="share" label="Condividi" onClick={share} />
        <ActionTile icon="download" label="Esporta JSON" href={`/api/schede/${planId}/export`} download />
        <ActionTile
          icon="trash"
          label="Elimina"
          danger
          onClick={() => {
            if (!confirm("Eliminare la scheda? Lo storico degli allenamenti verrà conservato.")) return;
            start(async () => {
              await deletePlan(planId);
              router.push("/schede");
            });
          }}
        />
      </div>
      <p aria-live="polite" className="text-sm font-medium text-ok">
        {message}
      </p>
    </div>
  );
}
