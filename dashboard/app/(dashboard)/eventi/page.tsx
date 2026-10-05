import { Calendar } from "lucide-react";
import Link from "next/link";
import { leggiDati } from "../../../lib/dataSource";
import type { EventiFile } from "../../../lib/types";
import { PageHeader } from "../../../components/ui/PageHeader";
import { EmptyState } from "../../../components/ui/EmptyState";
import { StatusBadge } from "../../../components/ui/StatusBadge";
import { Tabs } from "../../../components/ui/Tabs";
import { NuovoEventoForm } from "../../../components/NuovoEventoForm";
import { CalendarioEventi } from "../../../components/CalendarioEventi";
import { statusVocabulary } from "../../../lib/statusVocabulary";

export const dynamic = "force-dynamic";

function formattaData(data: string): string {
  const d = new Date(`${data}T00:00:00`);
  if (Number.isNaN(d.getTime())) return data;
  return d.toLocaleDateString("it-IT", { day: "numeric", month: "long", year: "numeric" });
}

function meseAnno(data: string): string {
  const d = new Date(`${data}T00:00:00`);
  if (Number.isNaN(d.getTime())) return "Data da definire";
  return d.toLocaleDateString("it-IT", { month: "long", year: "numeric" }).replace(/^\w/, (c) => c.toUpperCase());
}

export default async function EventiPage() {
  const file = await leggiDati<EventiFile>("eventi.json").catch((): EventiFile => ({ eventi: [] }));
  const oggi = new Date().toISOString().slice(0, 10);

  const prossimi = file.eventi
    .filter((e) => e.data >= oggi)
    .sort((a, b) => a.data.localeCompare(b.data));
  const passati = file.eventi
    .filter((e) => e.data < oggi)
    .sort((a, b) => b.data.localeCompare(a.data));

  // Raggruppa per mese mantenendo l'ordine già dato dalla lista.
  function raggruppaPerMese(eventi: typeof file.eventi) {
    const gruppi: { mese: string; eventi: typeof file.eventi }[] = [];
    for (const e of eventi) {
      const mese = meseAnno(e.data);
      const ultimo = gruppi[gruppi.length - 1];
      if (ultimo && ultimo.mese === mese) ultimo.eventi.push(e);
      else gruppi.push({ mese, eventi: [e] });
    }
    return gruppi;
  }

  const vistaLista = (
    <>
      <h3 className="mt-lg">In arrivo ({prossimi.length})</h3>
      {prossimi.length === 0 && <EmptyState title="Nessun evento in programma" description="Crea il primo evento con il pulsante qui sopra." />}
      {raggruppaPerMese(prossimi).map((gruppo) => (
        <div key={gruppo.mese} style={{ marginBottom: 20 }}>
          <div className="note" style={{ textTransform: "uppercase", letterSpacing: "0.06em", marginBottom: 8 }}>
            {gruppo.mese}
          </div>
          <div className="grid">
            {gruppo.eventi.map((e) => (
              <Link key={e.id} href={`/eventi/${e.id}`} className="card" style={{ display: "block" }}>
                <div className="flex gap-xs" style={{ justifyContent: "space-between", alignItems: "flex-start" }}>
                  <div className="label">{e.cliente}</div>
                  <StatusBadge {...statusVocabulary.tipoEvento(e.tipo)} />
                </div>
                <p className="note">{formattaData(e.data)}{e.location ? ` · ${e.location}` : ""}</p>
                {e.tipo === "matrimonio" && (
                  <StatusBadge {...statusVocabulary.pianificatore(e.pianificatoreCompilato ? "compilato" : "in-attesa")} />
                )}
              </Link>
            ))}
          </div>
        </div>
      ))}

      {passati.length > 0 && (
        <>
          <h3 className="mt-lg">Passati ({passati.length})</h3>
          {raggruppaPerMese(passati).map((gruppo) => (
            <div key={gruppo.mese} style={{ marginBottom: 20 }}>
              <div className="note" style={{ textTransform: "uppercase", letterSpacing: "0.06em", marginBottom: 8 }}>
                {gruppo.mese}
              </div>
              <div className="grid">
                {gruppo.eventi.map((e) => (
                  <Link key={e.id} href={`/eventi/${e.id}`} className="card" style={{ display: "block", opacity: 0.75 }}>
                    <div className="flex gap-xs" style={{ justifyContent: "space-between", alignItems: "flex-start" }}>
                      <div className="label">{e.cliente}</div>
                      <StatusBadge {...statusVocabulary.tipoEvento(e.tipo)} />
                    </div>
                    <p className="note">{formattaData(e.data)}{e.location ? ` · ${e.location}` : ""}</p>
                  </Link>
                ))}
              </div>
            </div>
          ))}
        </>
      )}
    </>
  );

  return (
    <div>
      <PageHeader
        icon={<Calendar size={22} aria-hidden="true" />}
        title="Eventi"
        description="Il calendario delle tue prenotazioni. Crea un evento appena confermi una data: per i matrimoni ottieni subito il link personale del Wedding Music Planner da mandare su WhatsApp."
        action={<NuovoEventoForm />}
      />

      {file.eventi.length === 0 ? (
        <EmptyState title="Nessun evento in programma" description="Crea il primo evento con il pulsante qui sopra." />
      ) : (
        <Tabs
          items={[
            { id: "calendario", label: "Calendario", content: <CalendarioEventi eventi={file.eventi} /> },
            { id: "lista", label: "Lista", content: vistaLista }
          ]}
        />
      )}
    </div>
  );
}
