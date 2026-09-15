// Legge i file data/*.json direttamente dal repository GitHub (Contents API)
// così la dashboard mostra sempre i dati più recenti aggiornati dagli agenti
// via GitHub Actions, senza bisogno di ridistribuire il sito ogni volta.
// In sviluppo locale, se GITHUB_REPO non è impostato, legge dal filesystem.
import { readFile } from "node:fs/promises";
import path from "node:path";

async function leggiDaGitHub<T>(fileName: string): Promise<T> {
  const repo = process.env.GITHUB_REPO;
  const branch = process.env.GITHUB_BRANCH ?? "main";
  const token = process.env.GITHUB_TOKEN;

  const url = `https://api.github.com/repos/${repo}/contents/data/${fileName}?ref=${branch}`;
  const res = await fetch(url, {
    headers: {
      Accept: "application/vnd.github.raw+json",
      ...(token ? { Authorization: `Bearer ${token}` } : {})
    },
    cache: "no-store"
  });

  if (!res.ok) {
    throw new Error(`Impossibile leggere data/${fileName} da GitHub (${res.status}): ${await res.text()}`);
  }
  return (await res.json()) as T;
}

async function leggiDaFilesystem<T>(fileName: string): Promise<T> {
  const filePath = path.resolve(process.cwd(), "..", "data", fileName);
  const raw = await readFile(filePath, "utf-8");
  return JSON.parse(raw) as T;
}

export async function leggiDati<T>(fileName: string): Promise<T> {
  if (process.env.GITHUB_REPO) {
    return leggiDaGitHub<T>(fileName);
  }
  return leggiDaFilesystem<T>(fileName);
}
