// Legge i file data/*.json direttamente dal repository GitHub (Contents API)
// così la dashboard mostra sempre i dati più recenti aggiornati dagli agenti
// via GitHub Actions, senza bisogno di ridistribuire il sito ogni volta.
// In sviluppo locale, se GITHUB_REPO non è impostato, legge dal filesystem.
import { readFile } from "node:fs/promises";
import path from "node:path";

async function leggiDaGitHub<T>(percorsoRelativo: string): Promise<T> {
  const repo = process.env.GITHUB_REPO;
  const branch = process.env.GITHUB_BRANCH ?? "main";
  const token = process.env.GITHUB_TOKEN;

  const url = `https://api.github.com/repos/${repo}/contents/${percorsoRelativo}?ref=${branch}`;
  const res = await fetch(url, {
    headers: {
      Accept: "application/vnd.github.raw+json",
      ...(token ? { Authorization: `Bearer ${token}` } : {})
    },
    cache: "no-store"
  });

  if (!res.ok) {
    throw new Error(`Impossibile leggere ${percorsoRelativo} da GitHub (${res.status}): ${await res.text()}`);
  }
  return (await res.json()) as T;
}

async function leggiDaFilesystem<T>(cartella: string, fileName: string): Promise<T> {
  const filePath = path.resolve(process.cwd(), "..", cartella, fileName);
  const raw = await readFile(filePath, "utf-8");
  return JSON.parse(raw) as T;
}

export async function leggiDati<T>(fileName: string): Promise<T> {
  if (process.env.GITHUB_REPO) {
    return leggiDaGitHub<T>(`data/${fileName}`);
  }
  return leggiDaFilesystem<T>("data", fileName);
}

// Legge config/brand.json — usato dalla pagina "Anteprima" per mostrare
// i post come appariranno davvero (nome account, handle, ecc.)
export async function leggiConfig<T>(fileName: string): Promise<T> {
  if (process.env.GITHUB_REPO) {
    return leggiDaGitHub<T>(`config/${fileName}`);
  }
  return leggiDaFilesystem<T>("config", fileName);
}

// Usata dalla pagina "Carica media": scrive direttamente nel repository
// GitHub (Contents API) così il nuovo file appare subito anche agli agenti
// che girano su GitHub Actions, senza passare da un deploy.
export async function aggiornaDatiSuGitHub<T>(
  fileName: string,
  mutate: (attuale: T) => T,
  messaggioCommit: string
): Promise<void> {
  const repo = process.env.GITHUB_REPO;
  const branch = process.env.GITHUB_BRANCH ?? "main";
  const token = process.env.GITHUB_TOKEN;
  if (!repo || !token) {
    throw new Error("GITHUB_REPO e GITHUB_TOKEN (con permesso di scrittura) sono necessari per caricare media dalla dashboard.");
  }

  const url = `https://api.github.com/repos/${repo}/contents/data/${fileName}`;
  const getRes = await fetch(`${url}?ref=${branch}`, {
    headers: { Accept: "application/vnd.github+json", Authorization: `Bearer ${token}` },
    cache: "no-store"
  });
  if (!getRes.ok) {
    throw new Error(`Impossibile leggere data/${fileName} da GitHub prima di scrivere (${getRes.status}): ${await getRes.text()}`);
  }
  const getJson = (await getRes.json()) as { sha: string; content: string };
  const attuale = JSON.parse(Buffer.from(getJson.content, "base64").toString("utf-8")) as T;

  const nuovo = mutate(attuale);
  const nuovoContenuto = Buffer.from(JSON.stringify(nuovo, null, 2) + "\n", "utf-8").toString("base64");

  const putRes = await fetch(url, {
    method: "PUT",
    headers: { Accept: "application/vnd.github+json", Authorization: `Bearer ${token}`, "content-type": "application/json" },
    body: JSON.stringify({ message: messaggioCommit, content: nuovoContenuto, sha: getJson.sha, branch })
  });
  if (!putRes.ok) {
    throw new Error(`Impossibile scrivere data/${fileName} su GitHub (${putRes.status}): ${await putRes.text()}`);
  }
}

// Lancia manualmente un workflow GitHub Actions (workflow_dispatch) — usato
// dalla pagina "Crea Reel AI" per far scrivere subito la didascalia (Occhio
// + Copy) invece di aspettare il prossimo ciclo giornaliero automatico.
// Richiede che il GITHUB_TOKEN abbia anche il permesso "Actions: Read and
// write" (oltre a "Contents"): se manca, l'errore è comunque recuperabile,
// il ciclo giornaliero lo farà comunque più tardi.
export async function lanciaWorkflow(nomeFileWorkflow: string, inputs?: Record<string, string>): Promise<void> {
  const repo = process.env.GITHUB_REPO;
  const branch = process.env.GITHUB_BRANCH ?? "main";
  const token = process.env.GITHUB_TOKEN;
  if (!repo || !token) {
    throw new Error("GITHUB_REPO e GITHUB_TOKEN sono necessari per avviare un workflow.");
  }

  const res = await fetch(`https://api.github.com/repos/${repo}/actions/workflows/${nomeFileWorkflow}/dispatches`, {
    method: "POST",
    headers: { Accept: "application/vnd.github+json", Authorization: `Bearer ${token}`, "content-type": "application/json" },
    body: JSON.stringify({ ref: branch, ...(inputs ? { inputs } : {}) })
  });
  if (!res.ok) {
    throw new Error(`Impossibile avviare il workflow ${nomeFileWorkflow} (${res.status}): ${await res.text()}`);
  }
}
