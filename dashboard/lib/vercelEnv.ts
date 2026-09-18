// Scrive la variabile d'ambiente su Vercel (per far leggere alla dashboard
// stessa il token appena rinnovato) e forza un nuovo deployment, così le
// funzioni serverless la rileggono senza bisogno di un redeploy manuale.
// Richiede un Personal Access Token Vercel con accesso al progetto — vedi
// README > "Rinnovo del token Meta dalla dashboard".
//
// riavviaDeploymentVercel() usa gitSource (mai deploymentId): un clone
// dell'ultimo deployment "Ready" ignora i commit successivi e congela la
// produzione a una versione vecchia per sempre (bug reale, risolto qui).
// Vedi anche l'Ignored Build Step del progetto Vercel: usa
// $VERCEL_GIT_PREVIOUS_SHA, non HEAD^ (che sui checkout superficiali di
// Vercel non si risolve, facendo saltare build vere per errore) — e un
// "git fetch origin <sha> --depth=1" mirato prima del diff, perché anche
// quel commit precedente può non esistere nella copia scaricata da Vercel
// ("git fetch --unshallow" fallisce silenziosamente lì: non è un clone
// shallow classico che --unshallow sappia estendere).
const VERCEL_BASE = "https://api.vercel.com";

function query(extra: Record<string, string> = {}): string {
  const teamId = process.env.VERCEL_TEAM_ID;
  const params = new URLSearchParams(teamId ? { teamId, ...extra } : extra);
  const qs = params.toString();
  return qs ? `?${qs}` : "";
}

function headers(): Record<string, string> {
  return { Authorization: `Bearer ${process.env.VERCEL_TOKEN}`, "content-type": "application/json" };
}

export async function aggiornaEnvVercel(nome: string, valore: string): Promise<{ ok: boolean; errore?: string }> {
  const projectId = process.env.VERCEL_PROJECT_ID;
  if (!process.env.VERCEL_TOKEN || !projectId) {
    return { ok: false, errore: "VERCEL_TOKEN/VERCEL_PROJECT_ID non configurati." };
  }

  try {
    const res = await fetch(`${VERCEL_BASE}/v10/projects/${projectId}/env${query({ upsert: "true" })}`, {
      method: "POST",
      headers: headers(),
      body: JSON.stringify({ key: nome, value: valore, type: "sensitive", target: ["production"] })
    });
    if (!res.ok) {
      return { ok: false, errore: `Scrittura env Vercel fallita (${res.status}): ${await res.text()}` };
    }
    return { ok: true };
  } catch (err) {
    return { ok: false, errore: err instanceof Error ? err.message : String(err) };
  }
}

export async function riavviaDeploymentVercel(): Promise<{ ok: boolean; errore?: string }> {
  const projectId = process.env.VERCEL_PROJECT_ID;
  if (!process.env.VERCEL_TOKEN || !projectId) {
    return { ok: false, errore: "VERCEL_TOKEN/VERCEL_PROJECT_ID non configurati." };
  }

  try {
    const progettoRes = await fetch(`${VERCEL_BASE}/v9/projects/${projectId}${query()}`, { headers: headers() });
    if (!progettoRes.ok) {
      return { ok: false, errore: `Impossibile leggere il progetto Vercel (${progettoRes.status}): ${await progettoRes.text()}` };
    }
    const progetto = (await progettoRes.json()) as {
      id: string;
      name: string;
      link?: { type?: string; repoId?: number };
    };

    const repoId = progetto.link?.repoId;
    if (!repoId) {
      return { ok: false, errore: "Il progetto Vercel non risulta collegato a un repository GitHub (link.repoId mancante)." };
    }
    // Stesso branch da cui la dashboard legge/scrive i dati (vedi dataSource.ts),
    // così codice e dati restano sempre allineati. Deploy sempre dalla sorgente
    // Git reale (mai clonando un deployment precedente): un clone riusa il
    // codice di quel vecchio build e ignora i commit successivi, congelando la
    // produzione a una versione vecchia per sempre.
    const branch = process.env.GITHUB_BRANCH ?? "main";

    const nuovoRes = await fetch(`${VERCEL_BASE}/v13/deployments${query()}`, {
      method: "POST",
      headers: headers(),
      body: JSON.stringify({
        name: progetto.name,
        project: progetto.id,
        target: "production",
        gitSource: { type: "github", ref: branch, repoId }
      })
    });
    if (!nuovoRes.ok) {
      return { ok: false, errore: `Avvio del redeploy fallito (${nuovoRes.status}): ${await nuovoRes.text()}` };
    }
    return { ok: true };
  } catch (err) {
    return { ok: false, errore: err instanceof Error ? err.message : String(err) };
  }
}
