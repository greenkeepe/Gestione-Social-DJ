import { leggiConfig } from "../../../lib/dataSource";

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
      <h2>Link utili</h2>
      <p className="note">
        Accesso diretto a tutti i pannelli dei servizi usati dal sistema. Se sei già loggato nel browser, un click ti porta subito dentro
        senza dover cercare. Per aggiungere o modificare una voce, basta modificare{" "}
        <code>config/link-utili.json</code> nel repository, nessun codice da toccare.
      </p>

      {dati.categorie.map((categoria) => (
        <div key={categoria.nome} style={{ marginTop: 24 }}>
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
