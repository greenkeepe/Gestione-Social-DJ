"use client";

import { useState, type ReactNode } from "react";
import { useRouter } from "next/navigation";
import { Plus } from "lucide-react";
import { Button } from "./ui/Button";
import { Tabs } from "./ui/Tabs";
import { CalendarioEventi } from "./CalendarioEventi";
import { NuovoEventoModal } from "./NuovoEventoModal";
import { useConfirm } from "./ui/ConfirmDialog";
import type { Evento } from "../lib/types";

function formattaData(data: string): string {
  const d = new Date(`${data}T00:00:00`);
  if (Number.isNaN(d.getTime())) return data;
  return d.toLocaleDateString("it-IT", { day: "numeric", month: "long", year: "numeric" });
}

// Coordina calendario, lista, e il modulo "Nuovo evento": sia il tasto in
// alto sia un tap su una casella vuota del calendario aprono lo stesso
// modulo, chiedendo prima conferma se si clicca direttamente sul
// calendario (per non creare un evento per sbaglio toccando lo schermo).
export function GestoreEventi({ eventi, vistaLista }: { eventi: Evento[]; vistaLista: ReactNode }) {
  const [modaleAperto, setModaleAperto] = useState(false);
  const [dataIniziale, setDataIniziale] = useState<string | undefined>(undefined);
  const { confirm, dialog } = useConfirm();
  const router = useRouter();

  async function handleGiornoClick(data: string) {
    const ok = await confirm({
      title: "Nuovo evento",
      message: `Creare un nuovo evento per il ${formattaData(data)}?`,
      confirmLabel: "Crea evento"
    });
    if (!ok) return;
    setDataIniziale(data);
    setModaleAperto(true);
  }

  function apriNuovoEvento() {
    setDataIniziale(undefined);
    setModaleAperto(true);
  }

  function handleCreato(evento: Evento) {
    setModaleAperto(false);
    router.push(`/eventi/${evento.id}`);
  }

  return (
    <div>
      <div style={{ marginBottom: 20 }}>
        <Button onClick={apriNuovoEvento}>
          <Plus size={16} aria-hidden="true" /> Nuovo evento
        </Button>
      </div>

      {eventi.length === 0 ? (
        <CalendarioEventi eventi={eventi} onGiornoClick={handleGiornoClick} />
      ) : (
        <Tabs
          items={[
            {
              id: "calendario",
              label: "Calendario",
              content: <CalendarioEventi eventi={eventi} onGiornoClick={handleGiornoClick} />
            },
            { id: "lista", label: "Lista", content: vistaLista }
          ]}
        />
      )}

      <NuovoEventoModal
        aperto={modaleAperto}
        dataIniziale={dataIniziale}
        onClose={() => setModaleAperto(false)}
        onCreato={handleCreato}
      />
      {dialog}
    </div>
  );
}
