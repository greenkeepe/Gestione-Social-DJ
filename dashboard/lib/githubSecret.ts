// Scrive/aggiorna un secret di GitHub Actions via API (Contents API non
// c'entra: i secrets hanno un endpoint a parte e vanno cifrati con la
// chiave pubblica del repository prima dell'invio, come richiesto da
// GitHub — vedi https://docs.github.com/en/rest/actions/secrets).
// Richiede che GITHUB_TOKEN (già usato per leggere/scrivere data/*.json)
// abbia anche il permesso sui secrets del repository: un PAT classico con
// scope "repo" ce l'ha già, un fine-grained PAT serve "Secrets: write".
// Se manca il permesso, fallisce con un errore chiaro invece di bloccare:
// chi chiama ricade sempre su "mostra il token, incollalo tu".
import sodium from "libsodium-wrappers";

export async function aggiornaSecretGitHub(nomeSecret: string, valore: string): Promise<{ ok: boolean; errore?: string }> {
  const repo = process.env.GITHUB_REPO;
  const token = process.env.GITHUB_TOKEN;
  if (!repo || !token) {
    return { ok: false, errore: "GITHUB_REPO/GITHUB_TOKEN non configurati su Vercel." };
  }

  try {
    const pkRes = await fetch(`https://api.github.com/repos/${repo}/actions/secrets/public-key`, {
      headers: { Accept: "application/vnd.github+json", Authorization: `Bearer ${token}` }
    });
    if (!pkRes.ok) {
      return { ok: false, errore: `Impossibile leggere la chiave pubblica del repo (${pkRes.status}): ${await pkRes.text()}` };
    }
    const { key, key_id } = (await pkRes.json()) as { key: string; key_id: string };

    await sodium.ready;
    const binKey = sodium.from_base64(key, sodium.base64_variants.ORIGINAL);
    const binValue = sodium.from_string(valore);
    const encryptedBytes = sodium.crypto_box_seal(binValue, binKey);
    const encryptedValue = sodium.to_base64(encryptedBytes, sodium.base64_variants.ORIGINAL);

    const putRes = await fetch(`https://api.github.com/repos/${repo}/actions/secrets/${nomeSecret}`, {
      method: "PUT",
      headers: { Accept: "application/vnd.github+json", Authorization: `Bearer ${token}`, "content-type": "application/json" },
      body: JSON.stringify({ encrypted_value: encryptedValue, key_id })
    });
    if (!putRes.ok) {
      return { ok: false, errore: `Scrittura del secret fallita (${putRes.status}): ${await putRes.text()}` };
    }
    return { ok: true };
  } catch (err) {
    return { ok: false, errore: err instanceof Error ? err.message : String(err) };
  }
}
