"use client";

import { useRouter } from "next/navigation";
import { useTransition } from "react";
import { deleteSession } from "@/lib/actions/workouts";
import { Button } from "./ui";

export function DeleteSessionButton({ id }: { id: string }) {
  const router = useRouter();
  const [pending, start] = useTransition();
  return (
    <Button
      variant="danger"
      icon="trash"
      disabled={pending}
      onClick={() => {
        if (!confirm("Eliminare questo allenamento dallo storico?")) return;
        start(async () => {
          await deleteSession(id);
          router.push("/storico");
        });
      }}
    >
      Elimina allenamento
    </Button>
  );
}
