// Restyling tipografico dei generi reali in config/brand.json (generi[]):
// Anni 70/80/90 → 70S/80S/90S, R&B/Soul → R&B, Latino → LATIN.
const rowA = ["70S", "80S", "90S", "POP", "DANCE"];
const rowB = ["LATIN", "ROCK", "R&B", "LOUNGE", "COMMERCIALE"];

function Row({ items, reverse }: { items: string[]; reverse?: boolean }) {
  const track = [...items, ...items];
  return (
    <div className={reverse ? "marquee-track-reverse" : "marquee-track"} aria-hidden>
      {track.map((genre, index) => (
        <span
          key={`${genre}-${index}`}
          className="font-display px-5 text-5xl uppercase text-ivory-dim/30 sm:px-7 sm:text-7xl md:text-8xl"
        >
          {genre}
          <span className="ml-5 text-champagne sm:ml-7">·</span>
        </span>
      ))}
    </div>
  );
}

export function MusicGenres() {
  return (
    <section className="overflow-hidden border-y border-line bg-ink py-20 md:py-28">
      <div className="container-edit mb-10">
        <p className="eyebrow">Un repertorio senza confini</p>
      </div>
      <div className="flex flex-col gap-2">
        <Row items={rowA} />
        <Row items={rowB} reverse />
      </div>
      <p className="sr-only">
        Generi musicali: {[...rowA, ...rowB].join(", ")}.
      </p>
    </section>
  );
}
