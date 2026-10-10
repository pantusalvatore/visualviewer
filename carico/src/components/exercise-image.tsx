import Image from "next/image";
import { MuscleMap } from "./muscle-map";
import { cx } from "./ui";

/**
 * Immagine di un esercizio. Tutte le immagini passano da qui: per cambiarne
 * la sorgente basta aggiornare i file in public/exercises/<slug>/ (o l'URL salvato
 * nel DB). Se non ci sono immagini viene disegnata la mappa muscolare.
 */
export function ExerciseImage({
  src,
  alt,
  primary,
  secondary,
  className,
  sizes = "(min-width: 1024px) 25vw, 50vw",
  priority,
}: {
  src: string | null | undefined;
  alt: string;
  primary: string;
  secondary?: string[];
  className?: string;
  sizes?: string;
  priority?: boolean;
}) {
  return (
    <div className={cx("relative overflow-hidden bg-surface-2", className)}>
      {src ? (
        <Image src={src} alt={alt} fill sizes={sizes} className="object-cover" unoptimized priority={priority} />
      ) : (
        <MuscleMap primary={primary} secondary={secondary} className="absolute inset-0 m-auto h-full w-full p-3" title={alt} />
      )}
    </div>
  );
}
