import { notFound } from "next/navigation";
import { leggiEvento } from "@/lib/eventi";
import { WeddingPlannerForm } from "@/components/sections/WeddingPlannerForm";

export default async function QuestionarioSposiPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const evento = await leggiEvento(id).catch(() => null);

  if (!evento || evento.tipo !== "matrimonio") {
    notFound();
  }

  if (evento.pianificatoreCompilato) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-ink px-6 py-20">
        <div className="max-w-md text-center">
          <p className="eyebrow mb-4">Forte DJ</p>
          <h1 className="font-display text-3xl text-ivory">Questionario già ricevuto</h1>
          <p className="mt-6 text-balance text-ivory-dim">
            Grazie {evento.cliente}! Andrea ha già tutte le risposte che ci avete mandato. Per modificare qualcosa,
            scrivigli pure su WhatsApp.
          </p>
        </div>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-ink py-20 md:py-28">
      <div className="container-edit max-w-3xl">
        <p className="eyebrow mb-4 text-center">Forte DJ</p>
        <h1 className="font-display text-balance text-center text-4xl leading-[1.1] text-ivory sm:text-5xl">
          Wedding Music Planner
        </h1>
        <p className="mx-auto mt-6 max-w-xl text-balance text-center text-lg leading-relaxed text-ivory-dim">
          Ciao {evento.cliente}! Raccontaci tutto quello che serve per costruire la colonna sonora del vostro giorno:
          location, cerimonia, festa, brani da non far mancare (e quelli da evitare).
        </p>
        <p className="mx-auto mt-2 max-w-xl text-balance text-center text-sm leading-relaxed text-ivory-dim/70">
          Tell us everything we need to build your wedding day&apos;s soundtrack: venue, ceremony, party, must-play
          (and must-avoid) songs.
        </p>

        <div className="mt-14">
          <WeddingPlannerForm eventId={evento.id} />
        </div>
      </div>
    </main>
  );
}
