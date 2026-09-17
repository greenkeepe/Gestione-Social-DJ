"use client";

import { Fragment, useState } from "react";
import type { ContattoLocale } from "../lib/types";
import { InviaEmailButton } from "./InviaEmailButton";

// Riga compatta (cliente | oggetto | invia) — tap sulla riga per aprire i
// dettagli (indirizzo, email, sito, testo completo) prima di decidere.
export function TabellaBozzeLocali({ contatti }: { contatti: ContattoLocale[] }) {
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
                      {c.categoria === "hotel" ? "Hotel/location" : c.categoria === "restaurant" ? "Ristorante" : "Test"}
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
