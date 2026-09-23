// Commit+push di data/ fatto direttamente dall'agente in esecuzione (non
// solo dallo step bash finale del workflow YAML, che scrive una volta sola
// all'uscita dell'intero job): serve a rendere visibile in dashboard il
// progresso mentre l'Agente Regista elabora più video in coda nella stessa
// esecuzione, uno alla volta man mano che finiscono — non tutti insieme
// solo alla fine. Stessa logica già usata negli step bash dei workflow
// (retry con rebase su push respinto per scrittura concorrente).
import { execFile } from "node:child_process";
import { promisify } from "node:util";

const execFileAsync = promisify(execFile);

export async function commitEPush(messaggio: string): Promise<boolean> {
  await execFileAsync("git", ["config", "user.name", "gestione-social-dj-bot"]).catch(() => {});
  await execFileAsync("git", ["config", "user.email", "actions@users.noreply.github.com"]).catch(() => {});
  await execFileAsync("git", ["add", "data/"]);

  // "git diff --cached --quiet" esce con codice 1 se ci sono differenze in
  // staging, 0 se non ce ne sono: execFile rifiuta la Promise sui codici
  // diversi da zero, quindi "rifiutata" qui significa "c'è qualcosa da
  // salvare", non un errore.
  const ciSonoModifiche = await execFileAsync("git", ["diff", "--cached", "--quiet"])
    .then(() => false)
    .catch(() => true);
  if (!ciSonoModifiche) return false;

  await execFileAsync("git", ["commit", "-m", messaggio]);

  const branch = process.env.GITHUB_REF_NAME;
  const comandoPull = branch ? ["pull", "--rebase", "origin", branch] : ["pull", "--rebase"];
  for (let tentativo = 0; tentativo < 5; tentativo++) {
    try {
      await execFileAsync("git", ["push"]);
      return true;
    } catch {
      await execFileAsync("git", comandoPull);
      await new Promise((r) => setTimeout(r, 1000 + Math.random() * 4000));
    }
  }
  throw new Error(`Push su git fallito dopo 5 tentativi: ${messaggio}`);
}

// Innesca un altro workflow via GitHub CLI (preinstallata sui runner
// GitHub Actions), stesso comando già usato dallo step "Fast-track" dei
// workflow YAML — qui richiamato direttamente dall'agente invece che da
// uno step bash separato, per farlo scattare subito dopo aver promosso un
// Reel da Telegram, senza aspettare la fine dell'intera coda in
// elaborazione. Richiede GITHUB_TOKEN nell'ambiente (letto in automatico
// da "gh"): se manca o il comando fallisce, chi chiama decide se è
// bloccante o no.
export async function innescaWorkflow(nomeFileWorkflow: string): Promise<void> {
  const branch = process.env.GITHUB_REF_NAME;
  const args = branch ? ["workflow", "run", nomeFileWorkflow, "--ref", branch] : ["workflow", "run", nomeFileWorkflow];
  await execFileAsync("gh", args);
}
