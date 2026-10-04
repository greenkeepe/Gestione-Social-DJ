import { Heart } from "lucide-react";
import { leggiDati } from "../../../lib/dataSource";
import type { QuestionariFile } from "../../../lib/types";
import { TabellaQuestionariSposi } from "../../../components/TabellaQuestionariSposi";
import { CopiaLinkButton } from "../../../components/CopiaLinkButton";
import { PageHeader } from "../../../components/ui/PageHeader";
import { EmptyState } from "../../../components/ui/EmptyState";

export const dynamic = "force-dynamic";

const LINK_QUESTIONARIO = "https://www.fortedj.it/questionario-sposi";

export default async function QuestionariPage() {
  const file = await leggiDati<QuestionariFile>("questionari-sposi.json").catch((): QuestionariFile => ({ questionari: [] }));
  const nuovi = file.questionari.filter((q) => !q.letto);
  const letti = file.questionari.filter((q) => q.letto);

  return (
    <div>
      <PageHeader
        icon={<Heart size={22} aria-hidden="true" />}
        title="Questionari sposi"
        description="Il Wedding Music Planner che compilano gli sposi dopo aver prenotato, al posto del vecchio Google Form. Manda tu il link via WhatsApp quando confermi una prenotazione: non è pubblico, non è nel menu del sito e non è indicizzato da Google."
        action={<CopiaLinkButton link={LINK_QUESTIONARIO} />}
      />
      <p className="note">{LINK_QUESTIONARIO}</p>

      <h3 className="mt-lg">Nuovi ({nuovi.length})</h3>
      {nuovi.length === 0 ? (
        <EmptyState title="Nessun questionario nuovo al momento" />
      ) : (
        <TabellaQuestionariSposi questionari={nuovi} />
      )}

      {letti.length > 0 && (
        <>
          <h3 className="mt-lg">Già letti ({letti.length})</h3>
          <TabellaQuestionariSposi questionari={letti} />
        </>
      )}
    </div>
  );
}
