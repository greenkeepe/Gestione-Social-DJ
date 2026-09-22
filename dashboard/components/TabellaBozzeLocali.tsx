"use client";

import { Fragment, useState } from "react";
import type { ContattoLocale } from "../lib/types";
import { InviaEmailButton } from "./InviaEmailButton";

// Riga compatta (cliente | oggetto | invia) — tap sulla riga per aprire i
// dettagli (indirizzo, email, sito, testo completo) prima di decidere.
// anteprimaFirma mostra come apparirà la firma reale, aggiunta solo al
// momento dell'invio (non è salvata nella bozza, vedi lib/firma.ts).
export function TabellaBozzeLocali({ contatti, anteprimaFirma }: { contatti: ContattoLocale[]; anteprimaFirma: string }) {
  const [apertaId, setApertaId] = useState<string | null>(null);

  return (
    <table>
      <thead>
        <tr>
          <th>Cliente</th>
          <th>Oggetto</th>
          <th></th>
        </tr>
      </thead>
      <tbody>
        {contatti.map((c) => {
          const aperta = apertaId === c.id;
          return (
            <Fragment key={c.id}>
              <tr className="riga-cliccabile" onClick={() => setApertaId(aperta ? null : c.id)}>
                <td>{c.nomeLocale}</td>
                <td>{c.oggetto}</td>
                <td onClick={(e) => e.stopPropagation()}>
                  <InviaEmailButton id={c.id} nomeLocale={c.nomeLocale} />
                </td>
              </tr>
              {aperta && (
                <tr>
                  <td colSpan={3}>
                    <p className="note">
                      {
                        {
                          "location-eventi": "Location per eventi",
                          castello: "Castello",
                          agriturismo: "Agriturismo/villa",
                          hotel: "Hotel/location",
                          restaurant: "Ristorante"
                        }[c.categoria] ?? "Test"
                      }
                      {c.indirizzo ? ` · ${c.indirizzo}` : ""}
                    </p>
                    <p className="note">
                      A: {c.email}
                      {c.sitoWeb && (
                        <>
                          {" · "}
                          <a href={c.sitoWeb} target="_blank" rel="noreferrer">sito web</a>
                        </>
                      )}
                      {" · "}
                      {new Date(c.creatoIl).toLocaleString("it-IT")}
                    </p>
                    <p style={{ whiteSpace: "pre-wrap" }}>{c.corpo}</p>
                    <p className="note" style={{ whiteSpace: "pre-wrap" }}>
                      {anteprimaFirma}
                      <br />
                      <em>(firma aggiunta in automatico all&apos;invio, non fa parte della bozza salvata)</em>
                    </p>
                  </td>
                </tr>
              )}
            </Fragment>
          );
        })}
      </tbody>
    </table>
  );
}
