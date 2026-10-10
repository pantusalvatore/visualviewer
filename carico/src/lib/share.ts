/**
 * Codifica una scheda esportata in una stringa compatta da mettere nel
 * frammento (#) di un link. Il frammento non viene mai inviato al server:
 * il link funziona su qualsiasi istanza dell'app e non espone dati.
 */
import { planExportSchema, type PlanExport } from "./plan-schema";

const PREFIX = "c1.";

function toBase64Url(bytes: Uint8Array): string {
  let bin = "";
  for (const b of bytes) bin += String.fromCharCode(b);
  return btoa(bin).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
}

function fromBase64Url(text: string): Uint8Array {
  const b64 = text.replace(/-/g, "+").replace(/_/g, "/") + "===".slice((text.length + 3) % 4);
  const bin = atob(b64);
  const out = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i++) out[i] = bin.charCodeAt(i);
  return out;
}

async function transform(bytes: Uint8Array, stream: CompressionStream | DecompressionStream): Promise<Uint8Array> {
  const piped = new Blob([bytes as BlobPart]).stream().pipeThrough(stream);
  return new Uint8Array(await new Response(piped).arrayBuffer());
}

export async function encodeShare(data: PlanExport): Promise<string> {
  const json = new TextEncoder().encode(JSON.stringify(data));
  const compressed = await transform(json, new CompressionStream("deflate-raw"));
  return PREFIX + toBase64Url(compressed);
}

export async function decodeShare(code: string): Promise<PlanExport> {
  const trimmed = code.trim().replace(/^#/, "");
  if (!trimmed.startsWith(PREFIX)) throw new Error("Link non valido o di una versione non supportata.");
  let json: unknown;
  try {
    const bytes = await transform(fromBase64Url(trimmed.slice(PREFIX.length)), new DecompressionStream("deflate-raw"));
    json = JSON.parse(new TextDecoder().decode(bytes));
  } catch {
    throw new Error("Il link è danneggiato o incompleto.");
  }
  const parsed = planExportSchema.safeParse(json);
  if (!parsed.success) throw new Error("Il link non contiene una scheda valida.");
  return parsed.data;
}
