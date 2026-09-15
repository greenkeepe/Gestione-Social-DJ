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

  const items = [...queueFile.queue].reverse();

  return (
    <div>
      <h2>Anteprima</h2>
      <p className="note">
        Così appariranno i post/reel una volta pubblicati — stesso media, stessa didascalia, stessi hashtag. Il riquadro colorato in alto a destra indica lo stato: in attesa di didascalia, pronto per la pubblicazione, o già pubblicato.
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
