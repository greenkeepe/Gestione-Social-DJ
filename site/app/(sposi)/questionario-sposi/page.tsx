import { WeddingPlannerForm } from "@/components/sections/WeddingPlannerForm";

export default function QuestionarioSposiPage() {
  return (
    <main className="min-h-screen bg-ink py-20 md:py-28">
      <div className="container-edit max-w-3xl">
        <p className="eyebrow mb-4 text-center">Forte DJ</p>
        <h1 className="font-display text-balance text-center text-4xl leading-[1.1] text-ivory sm:text-5xl">
          Wedding Music Planner
        </h1>
        <p className="mx-auto mt-6 max-w-xl text-balance text-center text-lg leading-relaxed text-ivory-dim">
          Raccontaci tutto quello che serve per costruire la colonna sonora del vostro giorno: location, cerimonia,
          festa, brani da non far mancare (e quelli da evitare). Bastano 10 minuti.
        </p>
        <p className="mx-auto mt-2 max-w-xl text-balance text-center text-sm leading-relaxed text-ivory-dim/70">
          Tell us everything we need to build your wedding day&apos;s soundtrack: venue, ceremony, party, must-play
          (and must-avoid) songs. Takes about 10 minutes.
        </p>

        <div className="mt-14 rounded-2xl border border-line bg-charcoal-soft p-6 sm:p-10">
          <WeddingPlannerForm />
        </div>
      </div>
    </main>
  );
}
