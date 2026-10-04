// Lettura/scrittura di data/eventi.json (GitHub Contents API) dal lato
// sito: stesso file che la dashboard legge/crea dalla pagina "Eventi". A
// differenza del vecchio flusso (un unico link pubblico generico), qui ogni
// evento ha il suo id: il sito legge l'evento specifico per renderizzare il
// Wedding Music Planner solo se esiste, è un matrimonio e non è già stato
// compilato, e scrive la risposta SOLO dentro quell'evento — mai un nuovo
// elemento "sciolto". A differenza delle notifiche email/Telegram (best
// effort), questa lettura/scrittura è il canale principale ora che i
// risultati si vedono in dashboard: se GITHUB_REPO/GITHUB_TOKEN non sono
// configurati su Vercel, il modulo smette di funzionare (errore esplicito),
// non silenzioso.
export interface PianificatoreMatrimonio {
  email: string;
  oraEvento: string;
  sposa: { nome: string; cognome: string; telefono: string; email: string; facebook: string; instagram: string };
  sposo: { nome: string; cognome: string; telefono: string; email: string; facebook: string; instagram: string };
  location: { nome: string; indirizzo: string };
  cerimonia: { oraInizio: string; branoIngresso: string; branoScambioAnelli: string; branoUscita: string };
  festa: { oraInizioEvento: string; branoIngressoSala: string; branoTaglioTorta: string; balloLento: string };
  generi: string[];
  altriGeneri: string;
  daEvitare: string;
  noteVarie: string;
  compilatoIl: string;
}

export interface Evento {
  id: string;
  tipo: "matrimonio" | "compleanno" | "aziendale" | "party" | "altro";
  cliente: string;
  telefono: string;
  email: string;
  data: string;
  location: string;
  note: string;
  creatoIl: string;
  pianificatoreCompilato: boolean;
  pianificatore: PianificatoreMatrimonio | null;
}

interface EventiFile {
  _istruzioni: string;
  eventi: Evento[];
}

function credenziali() {
  const repo = process.env.GITHUB_REPO;
  const branch = process.env.GITHUB_BRANCH ?? "main";
  const token = process.env.GITHUB_TOKEN;
  if (!repo || !token) {
    throw new Error("GITHUB_REPO e GITHUB_TOKEN non configurati: il Wedding Music Planner richiede queste variabili su Vercel (vedi .env.example).");
  }
  return { repo, branch, token };
}

export async function leggiEvento(id: string): Promise<Evento | null> {
  const { repo, branch, token } = credenziali();
  const url = `https://api.github.com/repos/${repo}/contents/data/eventi.json?ref=${branch}`;
  const res = await fetch(url, {
    headers: { Accept: "application/vnd.github.raw+json", Authorization: `Bearer ${token}` },
    cache: "no-store",
  });
  if (!res.ok) {
    throw new Error(`Impossibile leggere data/eventi.json da GitHub (${res.status}): ${await res.text()}`);
  }
  const file = (await res.json()) as EventiFile;
  return file.eventi.find((e) => e.id === id) ?? null;
}

export async function aggiornaEvento(id: string, mutate: (evento: Evento) => Evento): Promise<void> {
  const { repo, branch, token } = credenziali();
  const url = `https://api.github.com/repos/${repo}/contents/data/eventi.json`;
  const getRes = await fetch(`${url}?ref=${branch}`, {
    headers: { Accept: "application/vnd.github+json", Authorization: `Bearer ${token}` },
    cache: "no-store",
  });
  if (!getRes.ok) {
    throw new Error(`Impossibile leggere data/eventi.json da GitHub prima di scrivere (${getRes.status}): ${await getRes.text()}`);
  }
  const getJson = (await getRes.json()) as { sha: string; content: string };
  const file = JSON.parse(Buffer.from(getJson.content, "base64").toString("utf-8")) as EventiFile;

  const index = file.eventi.findIndex((e) => e.id === id);
  if (index === -1) throw new Error(`Evento ${id} non trovato in data/eventi.json.`);
  file.eventi[index] = mutate(file.eventi[index]);

  const nuovoContenuto = Buffer.from(JSON.stringify(file, null, 2) + "\n", "utf-8").toString("base64");
  const putRes = await fetch(url, {
    method: "PUT",
    headers: { Accept: "application/vnd.github+json", Authorization: `Bearer ${token}`, "content-type": "application/json" },
    body: JSON.stringify({ message: `chore(eventi): questionario compilato da "${file.eventi[index].cliente}"`, content: nuovoContenuto, sha: getJson.sha, branch }),
  });
  if (!putRes.ok) {
    throw new Error(`Impossibile scrivere data/eventi.json su GitHub (${putRes.status}): ${await putRes.text()}`);
  }
}
