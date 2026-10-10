import { getPlan, planToExport } from "@/lib/queries";
import { slugify } from "@/lib/custom-exercises";

export async function GET(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const plan = await getPlan(id);
  if (!plan) return new Response("Scheda non trovata", { status: 404 });
  return new Response(JSON.stringify(planToExport(plan), null, 2), {
    headers: {
      "Content-Type": "application/json; charset=utf-8",
      "Content-Disposition": `attachment; filename="scheda-${slugify(plan.name) || "carico"}.json"`,
    },
  });
}
