"use client";

import { useState } from "react";
import Link from "next/link";
import { ChevronLeft, ChevronRight } from "lucide-react";
import type { Evento } from "../lib/types";

const GIORNI_SETTIMANA = ["Lun", "Mar", "Mer", "Gio", "Ven", "Sab", "Dom"];
const MESI = [
  "Gennaio", "Febbraio", "Marzo", "Aprile", "Maggio", "Giugno",
  "Luglio", "Agosto", "Settembre", "Ottobre", "Novembre", "Dicembre"
];

// Oltre questo numero di eventi nello stesso giorno, il resto si riassume
// in "+N altri" invece di far crescere la cella all'infinito.
const MASSIMO_VISIBILI_PER_GIORNO = 3;

function isoData(anno: number, mese: number, giorno: number): string {
  return `${anno}-${String(mese + 1).padStart(2, "0")}-${String(giorno).padStart(2, "0")}`;
}

function oggiISO(): string {
  const d = new Date();
  return isoData(d.getFullYear(), d.getMonth(), d.getDate());
}

interface Cella {
  giorno: number;
  anno: number;
  mese: number;
  fuoriMese: boolean;
}

// Griglia di settimane complete (da lunedì), con i giorni del mese
// precedente/successivo usati solo per riempire la prima e l'ultima
// settimana — marcati "fuoriMese" per renderli più sbiaditi.
function costruisciCelle(anno: number, mese: number): Cella[] {
  const primoGiorno = new Date(anno, mese, 1);
  const offsetInizio = (primoGiorno.getDay() + 6) % 7; // lunedì = 0
  const giorniNelMese = new Date(anno, mese + 1, 0).getDate();
  const giorniMesePrecedente = new Date(anno, mese, 0).getDate();

  const celle: Cella[] = [];
  const mesePrec = mese === 0 ? 11 : mese - 1;
  const annoPrec = mese === 0 ? anno - 1 : anno;
  for (let i = offsetInizio - 1; i >= 0; i--) {
    celle.push({ giorno: giorniMesePrecedente - i, anno: annoPrec, mese: mesePrec, fuoriMese: true });
  }
  for (let g = 1; g <= giorniNelMese; g++) {
    celle.push({ giorno: g, anno, mese, fuoriMese: false });
  }

  const meseSucc = mese === 11 ? 0 : mese + 1;
  const annoSucc = mese === 11 ? anno + 1 : anno;
  const giorniDaAggiungere = (7 - (celle.length % 7)) % 7;
  for (let g = 1; g <= giorniDaAggiungere; g++) {
    celle.push({ giorno: g, anno: annoSucc, mese: meseSucc, fuoriMese: true });
  }
  return celle;
}

export function CalendarioEventi({ eventi }: { eventi: Evento[] }) {
  const oggi = new Date();
  const [anno, setAnno] = useState(oggi.getFullYear());
  const [mese, setMese] = useState(oggi.getMonth());

  const perGiorno = new Map<string, Evento[]>();
  for (const e of eventi) {
    if (!perGiorno.has(e.data)) perGiorno.set(e.data, []);
    perGiorno.get(e.data)!.push(e);
  }

  const celle = costruisciCelle(anno, mese);
  const oggiStr = oggiISO();

  function cambiaMese(delta: number) {
    const d = new Date(anno, mese + delta, 1);
    setAnno(d.getFullYear());
    setMese(d.getMonth());
  }

  return (
    <div className="calendar">
      <div className="calendar__header">
        <button type="button" className="calendar__nav-btn" onClick={() => cambiaMese(-1)} aria-label="Mese precedente">
          <ChevronLeft size={18} aria-hidden="true" />
        </button>
        <div className="calendar__month-label">
          {MESI[mese]} {anno}
        </div>
        <button type="button" className="calendar__nav-btn" onClick={() => cambiaMese(1)} aria-label="Mese successivo">
          <ChevronRight size={18} aria-hidden="true" />
        </button>
      </div>

      <div className="calendar__grid">
        {GIORNI_SETTIMANA.map((g) => (
          <div key={g} className="calendar__weekday">
            {g}
          </div>
        ))}
        {celle.map((cella, i) => {
          const dataStr = isoData(cella.anno, cella.mese, cella.giorno);
          const eventiGiorno = perGiorno.get(dataStr) ?? [];
          const visibili = eventiGiorno.slice(0, MASSIMO_VISIBILI_PER_GIORNO);
          const extra = eventiGiorno.length - visibili.length;
          const classi = [
            "calendar__day",
            cella.fuoriMese ? "calendar__day--outside" : "",
            dataStr === oggiStr ? "calendar__day--today" : ""
          ]
            .filter(Boolean)
            .join(" ");

          return (
            <div key={`${dataStr}-${i}`} className={classi}>
              <span className="calendar__day-number">{cella.giorno}</span>
              {eventiGiorno.length > 0 && (
                <div className="calendar__events">
                  {visibili.map((e) => (
                    <Link
                      key={e.id}
                      href={`/eventi/${e.id}`}
                      className={`calendar__event calendar__event--${e.tipo}`}
                      title={e.cliente}
                    >
                      {e.cliente}
                    </Link>
                  ))}
                  {extra > 0 && <span className="calendar__more">+{extra} altri</span>}
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
