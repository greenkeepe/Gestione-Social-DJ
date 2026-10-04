import { leggiDati } from "../../../lib/dataSource";
import type { QuestionariFile } from "../../../lib/types";
import { TabellaQuestionariSposi } from "../../../components/TabellaQuestionariSposi";
import { CopiaLinkButton } from "../../../components/CopiaLinkButton";

export const dynamic = "force-dynamic";

const LINK_QUESTIONARIO = "https://www.fortedj.it/questionario-sposi";

export default async function QuestionariPage() {
  const file = await leggiDati<QuestionariFile>("questionari-sposi.json").catch((): QuestionariFile => ({ questionari: [] }));
  const nuovi = file.questionari.filter((q) => !q.letto);
  const letti = file.questionari.filter((q) => q.letto);

  return (
    <div>
      <h2>Questionari sposi</h2>
      <p className="note">
        Il Wedding Music Planner che compilano gli sposi dopo aver prenotato, al posto del vecchio Google Form.
        Manda tu il link via WhatsApp quando confermi una prenotazione: non è pubblico, non è nel menu del sito e non
        è indicizzato da Google.
      </p>
      <div style={{ display: "flex", alignItems: "center", gap: 12, marginTop: 8, marginBottom: 24 }}>
        <code style={{ fontSize: "0.85rem" }}>{LINK_QUESTIONARIO}</code>
        <CopiaLinkButton link={LINK_QUESTIONARIO} />
      </div>

      <h3>Nuovi ({nuovi.length})</h3>
      {nuovi.length === 0 ? (
        <p className="note">Nessun questionario nuovo al momento.</p>
      ) : (
        <TabellaQuestionariSposi questionari={nuovi} />
      )}

      {letti.length > 0 && (
        <>
          <h3 style={{ marginTop: 32 }}>Già letti ({letti.length})</h3>
          <TabellaQuestionariSposi questionari={letti} />
        </>
      )}
    </div>
  );
}
