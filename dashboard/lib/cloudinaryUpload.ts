// Upload video verso Cloudinary dal browser. Sopra i ~100MB, un singolo
// upload "semplice" viene rifiutato con 413 (limite infrastrutturale di
// Cloudinary sulla dimensione di una singola richiesta, non del piano):
// per i file più grandi serve l'upload "a blocchi" (chunked/"large upload"),
// che spezza il file in pezzi e li invia in sequenza con lo stesso
// X-Unique-Upload-Id, fino a ricevere l'URL finale sull'ultimo blocco.
const SOGLIA_UPLOAD_SEMPLICE = 90 * 1024 * 1024; // 90MB: margine di sicurezza sotto il limite ~100MB
const DIMENSIONE_BLOCCO = 6 * 1024 * 1024; // 6MB per blocco (minimo richiesto da Cloudinary: 5MB)

export async function caricaVideoSuCloudinary(
  file: File,
  cloudName: string,
  uploadPreset: string,
  onProgress?: (percentuale: number) => void
): Promise<string> {
  if (file.size <= SOGLIA_UPLOAD_SEMPLICE) {
    const form = new FormData();
    form.append("file", file);
    form.append("upload_preset", uploadPreset);
    const res = await fetch(`https://api.cloudinary.com/v1_1/${cloudName}/video/upload`, { method: "POST", body: form });
    const json = await res.json();
    if (!res.ok) throw new Error(json.error?.message ?? `Caricamento su Cloudinary fallito (${res.status}).`);
    onProgress?.(100);
    return json.secure_url as string;
  }

  return caricaAChunk(file, cloudName, uploadPreset, onProgress);
}

async function caricaAChunk(
  file: File,
  cloudName: string,
  uploadPreset: string,
  onProgress?: (percentuale: number) => void
): Promise<string> {
  const uploadId = `reel-${Date.now()}-${Math.random().toString(36).slice(2)}`;
  let inizio = 0;
  let ultimaRisposta: { secure_url?: string; error?: { message?: string } } | null = null;

  while (inizio < file.size) {
    const fine = Math.min(inizio + DIMENSIONE_BLOCCO, file.size);
    const blocco = file.slice(inizio, fine);

    const form = new FormData();
    form.append("file", blocco, file.name);
    form.append("upload_preset", uploadPreset);
    form.append("cloud_name", cloudName);

    const res = await fetch(`https://api.cloudinary.com/v1_1/${cloudName}/video/upload`, {
      method: "POST",
      headers: {
        "X-Unique-Upload-Id": uploadId,
        "Content-Range": `bytes ${inizio}-${fine - 1}/${file.size}`
      },
      body: form
    });
    const json = await res.json();
    if (!res.ok) throw new Error(json.error?.message ?? `Caricamento a blocchi fallito (${res.status}) al ${Math.round((fine / file.size) * 100)}%.`);

    ultimaRisposta = json;
    inizio = fine;
    onProgress?.(Math.round((inizio / file.size) * 100));
  }

  if (!ultimaRisposta?.secure_url) throw new Error("Caricamento a blocchi completato ma Cloudinary non ha restituito un URL valido.");
  return ultimaRisposta.secure_url;
}
