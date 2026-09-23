import { leggiDati, leggiConfig } from "../../../lib/dataSource";
import { PostPreview } from "../../../components/PostPreview";
import type { PostsQueueFile } from "../../../lib/types";

export const dynamic = "force-dynamic";

interface Brand {
  nomeArte?: string;
  contatti?: { instagram?: string };
}

export default async function AnteprimaPage() {
  const [queueFile, brand] = await Promise.all([
    leggiDati<PostsQueueFile>("posts-queue.json"),
    leggiConfig<Brand>("brand.json")
  ]);

  const handleGrezzo = brand.contatti?.instagram?.trim();
  const handle = handleGrezzo && !handleGrezzo.startsWith("MODIFICA")
    ? (handleGrezzo.startsWith("@") ? handleGrezzo : `@${handleGrezzo}`)
    : "@il_tuo_handle";
  const nomeArte = brand.nomeArte && !brand.nomeArte.startsWith("MODIFICA") ? brand.nomeArte : "DJ";

  // Ordinati per data/ora di pubblicazione programmata (i più vicini prima),
  // non per ordine di inserimento in coda: così l'Anteprima si legge come un
  // vero calendario editoriale. I contenuti senza ancora una data (in attesa
  // di didascalia) restano in fondo, non essendo ancora "in calendario".
  const chiaveData = (item: (typeof queueFile.queue)[number]) =>
    item.dataProgrammata ? `${item.dataProgrammata} ${item.orarioProgrammato ?? "00:00"}` : "9999-99-99 99:99";
  const items = [...queueFile.queue].sort((a, b) => chiaveData(a).localeCompare(chiaveData(b)));

  return (
    <div>
      <h2>Anteprima</h2>
      <p className="note">
        Così appariranno i post/reel una volta pubblicati — stesso media, stessa didascalia, stessi hashtag. Ordinati per data di pubblicazione programmata. Il riquadro colorato in alto a destra indica lo stato: in attesa di didascalia, pronto (in calendario per un giorno futuro), in pubblicazione (è il turno di oggi, l&apos;Editore lo pubblica al prossimo controllo), o già pubblicato.
      </p>

      {items.length === 0 && (
        <p className="note">Nessun contenuto in coda al momento. Carica un media dalla pagina &quot;Carica media&quot; per vederne qui l&apos;anteprima.</p>
      )}

      <div className="preview-grid">
        {items.map((item) => (
          <PostPreview key={item.id} item={item} handle={handle} nomeArte={nomeArte} />
        ))}
      </div>
    </div>
  );
}
