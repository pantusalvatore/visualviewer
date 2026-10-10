import { prisma } from "@/lib/prisma";

export async function GET(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const media = await prisma.media.findUnique({ where: { id } });
  if (!media) return new Response("Immagine non trovata", { status: 404 });
  return new Response(new Uint8Array(media.data), {
    headers: { "Content-Type": media.mime, "Cache-Control": "public, max-age=31536000, immutable" },
  });
}
