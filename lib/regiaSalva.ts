// Salvataggio a prova di concorrenza per gli script di Regia: gli altri agenti
// (Copy, Editore, ciclo giornaliero) scrivono sugli stessi file data/*.json
// mentre Regia monta. Invece di un rebase che può andare in conflitto, a ogni
// tentativo si riparte dall'ultima versione remota, si riapplica SOLO la
// modifica (la funzione rilegge i file) e si invia subito. In locale (fuori da
// GitHub Actions) scrive solo i file, senza git.
import { execFile } from "node:child_process";
import { promisify } from "node:util";

const git = promisify(execFile);
const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

export async function applicaESalva(messaggio: string, modifica: () => Promise<boolean>): Promise<void> {
  const branch = process.env.GITHUB_REF_NAME;
  if (!branch) { await modifica(); return; }
  await git("git", ["config", "user.name", "gestione-social-dj-bot"]).catch(() => {});
  await git("git", ["config", "user.email", "actions@users.noreply.github.com"]).catch(() => {});
  for (let tentativo = 0; tentativo < 8; tentativo++) {
    await git("git", ["fetch", "-q", "origin", branch]);
    await git("git", ["reset", "-q", "--hard", `origin/${branch}`]);
    if (!(await modifica())) return; // niente da cambiare
    await git("git", ["add", "data/"]);
    const cambiato = await git("git", ["diff", "--cached", "--quiet"]).then(() => false).catch(() => true);
    if (!cambiato) return;
    await git("git", ["commit", "-q", "-m", messaggio]);
    try { await git("git", ["push", "-q", "origin", `HEAD:${branch}`]); return; }
    catch { await sleep(2000 + Math.random() * 6000); }
  }
  throw new Error(`Salvataggio non riuscito dopo 8 tentativi: ${messaggio}`);
}
