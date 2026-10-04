// Scrittura best-effort su data/*.json del repository (GitHub Contents
// API), equivalente di dashboard/lib/dataSource.ts ma per il sito (Netlify,
// nessun filesystem scrivibile condiviso con dashboard/agenti). Usata solo
// per far comparire i questionari sposi anche nella dashboard: se
// GITHUB_REPO/GITHUB_TOKEN non sono configurati su Netlify, la funzione
// solleva un errore che il chiamante ignora (l'email resta il canale
// principale, questo è solo un di più).
export async function aggiungiVoceSuGitHub<T extends { _istruzioni: string }>(
  fileName: string,
  mutate: (attuale: T) => T,
  messaggioCommit: string,
): Promise<void> {
  const repo = process.env.GITHUB_REPO;
  const branch = process.env.GITHUB_BRANCH ?? "main";
  const token = process.env.GITHUB_TOKEN;
  if (!repo || !token) {
    throw new Error("GITHUB_REPO e GITHUB_TOKEN non configurati su Netlify.");
  }

  const url = `https://api.github.com/repos/${repo}/contents/data/${fileName}`;
  const getRes = await fetch(`${url}?ref=${branch}`, {
    headers: { Accept: "application/vnd.github+json", Authorization: `Bearer ${token}` },
    cache: "no-store",
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
    body: JSON.stringify({ message: messaggioCommit, content: nuovoContenuto, sha: getJson.sha, branch }),
  });
  if (!putRes.ok) {
    throw new Error(`Impossibile scrivere data/${fileName} su GitHub (${putRes.status}): ${await putRes.text()}`);
  }
}
