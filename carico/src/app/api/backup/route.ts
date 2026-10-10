import { buildBackup } from "@/lib/backup";

export const dynamic = "force-dynamic";

export async function GET() {
  const backup = await buildBackup();
  const date = new Date().toISOString().slice(0, 10);
  return new Response(JSON.stringify(backup, null, 2), {
    headers: {
      "Content-Type": "application/json; charset=utf-8",
      "Content-Disposition": `attachment; filename="carico-backup-${date}.json"`,
    },
  });
}
