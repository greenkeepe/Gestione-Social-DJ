// Scrive la variabile d'ambiente su Vercel (per far leggere alla dashboard
// stessa il token appena rinnovato) e forza un nuovo deployment, così le
// funzioni serverless la rileggono senza bisogno di un redeploy manuale.
// Richiede un Personal Access Token Vercel con accesso al progetto — vedi
// README > "Rinnovo del token Meta dalla dashboard".
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
    const progetto = (await progettoRes.json()) as { id: string; name: string };

    const deployRes = await fetch(
      `${VERCEL_BASE}/v6/deployments${query({ projectId: progetto.id, target: "production", limit: "1", state: "READY" })}`,
      { headers: headers() }
    );
    if (!deployRes.ok) {
      return { ok: false, errore: `Impossibile leggere l'ultimo deployment (${deployRes.status}): ${await deployRes.text()}` };
    }
    const deployJson = (await deployRes.json()) as { deployments?: Array<{ uid?: string; id?: string }> };
    const ultimo = deployJson.deployments?.[0];
    const deploymentId = ultimo?.uid ?? ultimo?.id;
    if (!deploymentId) {
      return { ok: false, errore: "Nessun deployment di produzione trovato da cui ripartire." };
    }

    const nuovoRes = await fetch(`${VERCEL_BASE}/v13/deployments${query()}`, {
      method: "POST",
      headers: headers(),
      body: JSON.stringify({ name: progetto.name, project: progetto.id, deploymentId, target: "production" })
    });
    if (!nuovoRes.ok) {
      return { ok: false, errore: `Avvio del redeploy fallito (${nuovoRes.status}): ${await nuovoRes.text()}` };
    }
    return { ok: true };
  } catch (err) {
    return { ok: false, errore: err instanceof Error ? err.message : String(err) };
  }
}
