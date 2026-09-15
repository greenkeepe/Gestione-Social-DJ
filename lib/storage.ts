// Storage "a costo zero": i dati vivono come file JSON dentro data/,
// versionati su git. Il workflow giornaliero (GitHub Actions) li aggiorna
// e li ricommitta: niente database a pagamento, e la cronologia delle
// modifiche resta comunque tracciata da git.
import { readFile, writeFile } from "node:fs/promises";
import { fileURLToPath } from "node:url";
import path from "node:path";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const DATA_DIR = path.resolve(__dirname, "..", "data");
const CONFIG_DIR = path.resolve(__dirname, "..", "config");

export async function readData<T>(fileName: string): Promise<T> {
  const filePath = path.join(DATA_DIR, fileName);
  const raw = await readFile(filePath, "utf-8");
  return JSON.parse(raw) as T;
}

export async function writeData<T>(fileName: string, data: T): Promise<void> {
  const filePath = path.join(DATA_DIR, fileName);
  await writeFile(filePath, JSON.stringify(data, null, 2) + "\n", "utf-8");
}

export async function readBrand<T = Record<string, unknown>>(): Promise<T> {
  const raw = await readFile(path.join(CONFIG_DIR, "brand.json"), "utf-8");
  return JSON.parse(raw) as T;
}

export function nowIso(): string {
  return new Date().toISOString();
}
