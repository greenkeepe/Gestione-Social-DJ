// Wrapper opzionale per generazione testi con Claude (Anthropic API).
// Se ANTHROPIC_API_KEY non è impostata, tutto il sistema funziona comunque
// con i template in agents/content-agent.ts: zero costo, zero dipendenze.
// Se la imposti, i testi diventano più naturali e variati (costo minimo a
// consumo — vedi README "Upgrade path").
export async function generaTestoConLLM(prompt: string): Promise<string | null> {
  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) return null;

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
  return testo?.trim() ?? null;
}
