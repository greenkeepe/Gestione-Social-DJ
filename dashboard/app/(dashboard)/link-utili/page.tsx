import { Link2 } from "lucide-react";
import { leggiConfig } from "../../../lib/dataSource";
import { PageHeader } from "../../../components/ui/PageHeader";

export const dynamic = "force-dynamic";

interface LinkUtiliFile {
  categorie: Array<{
    nome: string;
    link: Array<{ nome: string; url: string; nota?: string }>;
  }>;
}

export default async function LinkUtiliPage() {
  const dati = await leggiConfig<LinkUtiliFile>("link-utili.json");

  return (
    <div>
      <PageHeader
        icon={<Link2 size={22} aria-hidden="true" />}
        title="Link utili"
        description="Accesso diretto a tutti i pannelli dei servizi usati dal sistema. Se sei già loggato nel browser, un click ti porta subito dentro senza dover cercare. Per aggiungere o modificare una voce, basta modificare config/link-utili.json nel repository, nessun codice da toccare."
      />

      {dati.categorie.map((categoria) => (
        <div key={categoria.nome} className="mt-lg">
          <h3>{categoria.nome}</h3>
          <div className="grid">
            {categoria.link.map((voce) => (
              <a key={voce.url} href={voce.url} target="_blank" rel="noreferrer" className="card" style={{ display: "block", textDecoration: "none", color: "inherit" }}>
                <div className="label">{voce.nome} ↗</div>
                {voce.nota && <p className="note">{voce.nota}</p>}
              </a>
            ))}
          </div>
        </div>
      ))}
    </div>
  );
}
