// Wrapper opzionale per generazione testi con Claude (Anthropic API).
// Se ANTHROPIC_API_KEY non è impostata, tutto il sistema funziona comunque
// con i template in agents/content-agent.ts: zero costo, zero dipendenze.
// Se la imposti, i testi diventano più naturali e variati (costo minimo a
// consumo — vedi README "Upgrade path").
import { anthropicPausato, registraChiamataAnthropic } from "./anthropicUsage.js";

export async function generaTestoConLLM(prompt: string): Promise<string | null> {
  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) return null;
  if (await anthropicPausato()) return null; // soglia mensile scelta in dashboard superata: si torna ai template

  const res = await fetch("https://api.anthropic.com/v1/messages", {
    method: "POST",
    headers: {
      "content-type": "application/json",
      "x-api-key": apiKey,
      "anthropic-version": "2023-06-01"
    },
    body: JSON.stringify({
      model: "claude-sonnet-5",
      max_tokens: 400,
      messages: [{ role: "user", content: prompt }]
    })
  });

  if (!res.ok) {
    console.error("[llm] chiamata Anthropic fallita:", res.status, await res.text());
    return null;
  }

  const json = (await res.json()) as { content: Array<{ type: string; text?: string }> };
  const testo = json.content.find((c) => c.type === "text")?.text;
  await registraChiamataAnthropic();
  return testo?.trim() ?? null;
}

export interface ImmagineDaAnalizzare {
  url?: string;
  base64?: { mediaType: string; data: string };
}

// Variante "con visione": Claude guarda davvero l'immagine (una foto, o un
// fotogramma estratto da un video/reel — vedi lib/videoTools.ts) e scrive un
// testo pertinente a quello che è raffigurato, invece di un template fisso
// scollegato dal contenuto reale. Stesso comportamento "zero costo" delle
// altre funzioni in questo file: senza ANTHROPIC_API_KEY ritorna null e chi
// chiama ricade su un metodo più semplice.
export async function generaTestoConLLMEImmagine(prompt: string, immagine: ImmagineDaAnalizzare): Promise<string | null> {
  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) return null;
  if (await anthropicPausato()) return null; // soglia mensile scelta in dashboard superata: si torna ai template

  const sourceBlock = immagine.url
    ? { type: "url", url: immagine.url }
    : immagine.base64
      ? { type: "base64", media_type: immagine.base64.mediaType, data: immagine.base64.data }
      : null;
  if (!sourceBlock) return null;

  const res = await fetch("https://api.anthropic.com/v1/messages", {
    method: "POST",
    headers: {
      "content-type": "application/json",
      "x-api-key": apiKey,
      "anthropic-version": "2023-06-01"
    },
    body: JSON.stringify({
      model: "claude-sonnet-5",
      max_tokens: 400,
      messages: [
        {
          role: "user",
          content: [
            { type: "image", source: sourceBlock },
            { type: "text", text: prompt }
          ]
        }
      ]
    })
  });

  if (!res.ok) {
    console.error("[llm] chiamata Anthropic (con immagine) fallita:", res.status, await res.text());
    return null;
  }

  const json = (await res.json()) as { content: Array<{ type: string; text?: string }> };
  const testo = json.content.find((c) => c.type === "text")?.text;
  await registraChiamataAnthropic();
  return testo?.trim() ?? null;
}
