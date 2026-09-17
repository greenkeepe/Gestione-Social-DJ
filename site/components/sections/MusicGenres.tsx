import { SectionHeading } from "@/components/ui/SectionHeading";

// Restyling tipografico dei generi reali in config/brand.json (generi[]):
// Anni 70/80/90 → 70S/80S/90S, R&B/Soul → R&B, Latino → LATIN.
const genres = [
  "70S",
  "80S",
  "90S",
  "POP",
  "DANCE",
  "LATIN",
  "ROCK",
  "R&B",
  "LOUNGE",
  "COMMERCIALE",
];

export function MusicGenres() {
  const track = [...genres, ...genres];

  return (
    <section className="overflow-hidden border-y border-line bg-ink py-16 md:py-20">
      <div className="container-edit mb-10">
        <SectionHeading eyebrow="Musica" title="UN REPERTORIO SENZA CONFINI" />
      </div>
      <div className="marquee-track" aria-hidden>
        {track.map((genre, index) => (
          <span
            key={`${genre}-${index}`}
            className="font-display px-6 text-4xl text-ivory-dim/40 sm:px-8 sm:text-6xl md:text-7xl"
          >
            {genre}
            <span className="ml-6 text-champagne sm:ml-8">·</span>
          </span>
        ))}
      </div>
      <p className="sr-only">
        Generi musicali: {genres.join(", ")}.
      </p>
    </section>
  );
}
