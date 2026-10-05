import type { PianificatoreMatrimonio } from "../lib/types";

function Riga({ label, valore }: { label: string; valore?: string | null }) {
  if (!valore) return null;
  return (
    <p className="note">
      <strong>{label}:</strong> {valore}
    </p>
  );
}

export function DettagliPianificatore({ p }: { p: PianificatoreMatrimonio }) {
  return (
    <div className="card">
      <p className="note">Compilato il {new Date(p.compilatoIl).toLocaleString("it-IT")}</p>
      <Riga label="Email di contatto" valore={p.email} />
      <Riga label="Telefono di contatto" valore={p.telefono} />
      <Riga label="Ora evento" valore={p.oraEvento} />

      <p style={{ marginTop: 12 }}>
        <strong>Sposi</strong>
      </p>
      <Riga label="Sposa" valore={`${p.sposa.nome} ${p.sposa.cognome}`} />
      <Riga label="Sposo" valore={`${p.sposo.nome} ${p.sposo.cognome}`} />

      <p style={{ marginTop: 12 }}>
        <strong>Location</strong>
      </p>
      <Riga label="Nome" valore={p.location.nome} />
      <Riga label="Indirizzo" valore={p.location.indirizzo} />

      <p style={{ marginTop: 12 }}>
        <strong>Cerimonia</strong>
      </p>
      {p.cerimoniaInLoco ? (
        <>
          <Riga label="Orario inizio" valore={p.cerimonia.oraInizio} />
          <Riga label="Brano ingresso sposa" valore={p.cerimonia.branoIngresso} />
          <Riga label="Brano scambio anelli" valore={p.cerimonia.branoScambioAnelli} />
          <Riga label="Brano fine cerimonia" valore={p.cerimonia.branoUscita} />
        </>
      ) : (
        <p className="note">Nessuna cerimonia in loco con il DJ.</p>
      )}

      <p style={{ marginTop: 12 }}>
        <strong>La festa</strong>
      </p>
      <Riga label="Ora inizio evento" valore={p.festa.oraInizioEvento} />
      <Riga label="Brano ingresso sposi in sala" valore={p.festa.branoIngressoSala} />
      <Riga label="Brano taglio torta" valore={p.festa.branoTaglioTorta} />
      <Riga label="Brano ballo lento (primo ballo)" valore={p.festa.balloLento} />

      <p style={{ marginTop: 12 }}>
        <strong>Generi e mood</strong>
      </p>
      <Riga label="Generi preferiti" valore={p.generi.join(", ")} />
      <Riga label="Altro" valore={p.altriGeneri} />
      <Riga label="Da evitare" valore={p.daEvitare} />
      <Riga label="Varie ed eventuali" valore={p.noteVarie} />
    </div>
  );
}
