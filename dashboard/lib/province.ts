// Stessa lista di agents/../lib/province.ts, duplicata qui per evitare
// dipendenze tra i due progetti (dashboard e root hanno build separate) —
// lista statica, cambia raramente.
export interface Provincia {
  sigla: string;
  nome: string;
  regione: string;
}

export const PROVINCE: Provincia[] = [
  { sigla: "AL", nome: "Alessandria", regione: "Piemonte" },
  { sigla: "AT", nome: "Asti", regione: "Piemonte" },
  { sigla: "BI", nome: "Biella", regione: "Piemonte" },
  { sigla: "CN", nome: "Cuneo", regione: "Piemonte" },
  { sigla: "NO", nome: "Novara", regione: "Piemonte" },
  { sigla: "TO", nome: "Torino", regione: "Piemonte" },
  { sigla: "VB", nome: "Verbano-Cusio-Ossola", regione: "Piemonte" },
  { sigla: "VC", nome: "Vercelli", regione: "Piemonte" },
  { sigla: "GE", nome: "Genova", regione: "Liguria" },
  { sigla: "IM", nome: "Imperia", regione: "Liguria" },
  { sigla: "SP", nome: "La Spezia", regione: "Liguria" },
  { sigla: "SV", nome: "Savona", regione: "Liguria" },
  { sigla: "BG", nome: "Bergamo", regione: "Lombardia" },
  { sigla: "BS", nome: "Brescia", regione: "Lombardia" },
  { sigla: "CO", nome: "Como", regione: "Lombardia" },
  { sigla: "CR", nome: "Cremona", regione: "Lombardia" },
  { sigla: "LC", nome: "Lecco", regione: "Lombardia" },
  { sigla: "LO", nome: "Lodi", regione: "Lombardia" },
  { sigla: "MN", nome: "Mantova", regione: "Lombardia" },
  { sigla: "MI", nome: "Milano", regione: "Lombardia" },
  { sigla: "MB", nome: "Monza e della Brianza", regione: "Lombardia" },
  { sigla: "PV", nome: "Pavia", regione: "Lombardia" },
  { sigla: "SO", nome: "Sondrio", regione: "Lombardia" },
  { sigla: "VA", nome: "Varese", regione: "Lombardia" }
];
