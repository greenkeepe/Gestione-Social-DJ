// Upload diretto dal browser a Cloudflare R2, usato sia da "Carica media"
// sia da "Crea Reel AI". Sostituisce il vecchio upload verso Cloudinary:
// R2 accetta una singola PUT fino a 5GiB (nessun limite di 100MB da
// aggirare, nessun bisogno di spezzare il file a blocchi) e il traffico in
// uscita da R2 è gratuito. Le credenziali R2 restano sempre sul server: il
// browser riceve solo un URL "presigned" temporaneo (vedi
// dashboard/app/api/r2-presign/route.ts).
export async function caricaSuR2(file: File, onProgress?: (percentuale: number) => void): Promise<string> {
  const presignRes = await fetch("/api/r2-presign", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ filename: file.name, contentType: file.type || "application/octet-stream" })
  });
  const presignJson = await presignRes.json();
  if (!presignRes.ok) throw new Error(presignJson.error ?? "Impossibile ottenere l'URL di caricamento da R2.");

  const { uploadUrl, publicUrl } = presignJson as { uploadUrl: string; publicUrl: string };

  // XMLHttpRequest invece di fetch: è l'unico modo per avere una percentuale
  // di avanzamento reale durante l'upload di un file grande.
  await new Promise<void>((resolve, reject) => {
    const xhr = new XMLHttpRequest();
    xhr.open("PUT", uploadUrl);
    xhr.setRequestHeader("content-type", file.type || "application/octet-stream");
    xhr.upload.onprogress = (evento) => {
      if (evento.lengthComputable) onProgress?.(Math.round((evento.loaded / evento.total) * 100));
    };
    xhr.onload = () => {
      if (xhr.status >= 200 && xhr.status < 300) resolve();
      else reject(new Error(`Caricamento su R2 fallito (${xhr.status}).`));
    };
    xhr.onerror = () => reject(new Error("Caricamento su R2 fallito (errore di rete)."));
    xhr.send(file);
  });

  return publicUrl;
}
