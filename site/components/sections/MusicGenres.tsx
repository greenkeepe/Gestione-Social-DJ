import { useTranslations } from "next-intl";

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
  const t = useTranslations("MusicGenresSection");
  const rowA = t.raw("rowA") as string[];
  const rowB = t.raw("rowB") as string[];

  return (
    <section className="overflow-hidden border-y border-line bg-ink py-20 md:py-28">
      <div className="container-edit mb-10">
        <p className="eyebrow">{t("eyebrow")}</p>
      </div>
      <div className="flex flex-col gap-2">
        <Row items={rowA} />
        <Row items={rowB} reverse />
      </div>
      <p className="sr-only">
        {t("srList", { genres: [...rowA, ...rowB].join(", ") })}
      </p>
    </section>
  );
}
