"use client";

import { Fragment, useState } from "react";
import type { QuestionarioSposi } from "../lib/types";
import { SegnaLettoButton } from "./SegnaLettoButton";
import { StatusBadge } from "./ui/StatusBadge";
import { statusVocabulary } from "../lib/statusVocabulary";

function Riga({ label, valore }: { label: string; valore?: string | null }) {
  if (!valore) return null;
  return (
    <p className="note">
      <strong>{label}:</strong> {valore}
    </p>
  );
}

export function TabellaQuestionariSposi({ questionari }: { questionari: QuestionarioSposi[] }) {
  const [apertoId, setApertoId] = useState<string | null>(null);

  return (
    <div className="table-scroll">
    <table>
      <thead>
        <tr>
          <th>Sposi</th>
          <th>Data matrimonio</th>
          <th>Location</th>
          <th>Stato</th>
          <th></th>
        </tr>
      </thead>
      <tbody>
        {questionari.map((q) => {
          const aperto = apertoId === q.id;
          return (
            <Fragment key={q.id}>
              <tr className="riga-cliccabile" onClick={() => setApertoId(aperto ? null : q.id)}>
                <td>
                  {q.sposa.nome} {q.sposa.cognome} &amp; {q.sposo.nome} {q.sposo.cognome}
                </td>
                <td>
                  {q.dataMatrimonio ? new Date(q.dataMatrimonio).toLocaleDateString("it-IT") : "—"}
                  {q.oraEvento ? ` · ${q.oraEvento}` : ""}
                </td>
                <td>{q.location.nome}</td>
                <td>
                  <StatusBadge {...statusVocabulary.questionario(q.letto ? "letto" : "nuovo")} />
                </td>
                <td onClick={(e) => e.stopPropagation()}>
                  <SegnaLettoButton id={q.id} letto={q.letto} />
                </td>
              </tr>
              {aperto && (
                <tr>
                  <td colSpan={5}>
                    <p className="note">Compilato il {new Date(q.creatoIl).toLocaleString("it-IT")}</p>
                    <Riga label="Email di contatto" valore={q.email} />

                    <p style={{ marginTop: 12 }}>
                      <strong>Sposa</strong>
                    </p>
                    <Riga label="Nome" valore={`${q.sposa.nome} ${q.sposa.cognome}`} />
                    <Riga label="Telefono" valore={q.sposa.telefono} />
                    <Riga label="Email" valore={q.sposa.email} />
                    <Riga label="Facebook" valore={q.sposa.facebook} />
                    <Riga label="Instagram" valore={q.sposa.instagram} />

                    <p style={{ marginTop: 12 }}>
                      <strong>Sposo</strong>
                    </p>
                    <Riga label="Nome" valore={`${q.sposo.nome} ${q.sposo.cognome}`} />
                    <Riga label="Telefono" valore={q.sposo.telefono} />
                    <Riga label="Email" valore={q.sposo.email} />
                    <Riga label="Facebook" valore={q.sposo.facebook} />
                    <Riga label="Instagram" valore={q.sposo.instagram} />

                    <p style={{ marginTop: 12 }}>
                      <strong>Location</strong>
                    </p>
                    <Riga label="Nome" valore={q.location.nome} />
                    <Riga label="Indirizzo" valore={q.location.indirizzo} />

                    <p style={{ marginTop: 12 }}>
                      <strong>Cerimonia</strong>
                    </p>
                    <Riga label="Orario inizio" valore={q.cerimonia.oraInizio} />
                    <Riga label="Brano ingresso sposa" valore={q.cerimonia.branoIngresso} />
                    <Riga label="Brano scambio anelli" valore={q.cerimonia.branoScambioAnelli} />
                    <Riga label="Brano fine cerimonia" valore={q.cerimonia.branoUscita} />

                    <p style={{ marginTop: 12 }}>
                      <strong>La festa</strong>
                    </p>
                    <Riga label="Ora inizio evento" valore={q.festa.oraInizioEvento} />
                    <Riga label="Brano ingresso sposi in sala" valore={q.festa.branoIngressoSala} />
                    <Riga label="Brano taglio torta" valore={q.festa.branoTaglioTorta} />
                    <Riga label="Brano ballo lento" valore={q.festa.balloLento} />

                    <p style={{ marginTop: 12 }}>
                      <strong>Generi e mood</strong>
                    </p>
                    <Riga label="Generi preferiti" valore={q.generi.join(", ")} />
                    <Riga label="Altro" valore={q.altriGeneri} />
                    <Riga label="Da evitare" valore={q.daEvitare} />
                    <Riga label="Varie ed eventuali" valore={q.noteVarie} />
                  </td>
                </tr>
              )}
            </Fragment>
          );
        })}
      </tbody>
    </table>
    </div>
  );
}
