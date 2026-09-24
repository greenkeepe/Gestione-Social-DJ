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

  // In cima quelli in pubblicazione OGGI (o rimasti indietro da un giorno
  // passato): sono il turno di adesso, quello che a chi guarda la pagina
  // interessa vedere per primo — con la possibilità di premere "Pubblica
  // ora" senza dover cercare la riga giusta in mezzo a tutte le altre. Poi
  // il resto in ordine di data/ora di pubblicazione programmata (i più
  // vicini prima). I contenuti senza ancora una data (in attesa di
  // didascalia) restano in fondo a tutto, non essendo ancora "in calendario".
  const oggi = new Date().toISOString().slice(0, 10);
  const inPubblicazioneOggi = (item: (typeof queueFile.queue)[number]) =>
    item.status === "pronto" && Boolean(item.dataProgrammata) && item.dataProgrammata! <= oggi;
  const chiaveData = (item: (typeof queueFile.queue)[number]) =>
    item.dataProgrammata ? `${item.dataProgrammata} ${item.orarioProgrammato ?? "00:00"}` : "9999-99-99 99:99";
  // Il già pubblicato non è più un'"anteprima" di niente: ha solo la sua data
  // reale nel passato, quindi in mezzo all'ordine cronologico finiva in cima
  // mischiato ai contenuti di oggi invece che sparire. Resta comunque
  // consultabile per intero nella pagina "Contenuti" e in published-log.json
  // — qui va solo tolto di mezzo.
  const items = queueFile.queue
    .filter((item) => item.status !== "pubblicato" && item.status !== "pubblicato-parziale")
    .sort((a, b) => {
      const priorita = Number(inPubblicazioneOggi(b)) - Number(inPubblicazioneOggi(a));
      if (priorita !== 0) return priorita;
      return chiaveData(a).localeCompare(chiaveData(b));
    });

  return (
    <div>
      <h2>Anteprima</h2>
      <p className="note">
        Così appariranno i post/reel una volta pubblicati — stesso media, stessa didascalia, stessi hashtag. In cima quelli in pubblicazione oggi, poi gli altri in ordine cronologico esatto di data e ora. Il riquadro colorato in alto a destra indica lo stato: in attesa di didascalia, pronto (in calendario per un giorno futuro) o in pubblicazione (è il turno di oggi, l&apos;Editore lo pubblica al prossimo controllo). Su ogni contenuto pronto trovi anche &quot;Pubblica ora&quot;, per farlo uscire subito a mano invece di aspettare. Il già pubblicato non compare più qui: trovi lo storico completo nella pagina &quot;Contenuti&quot;.
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
