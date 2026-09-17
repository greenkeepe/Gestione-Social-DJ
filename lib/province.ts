// Elenco delle province nelle regioni coperte (vedi config/brand.json >
// areaServita.regioniCoperte), con il capoluogo usato per geocodificare il
// centro di ricerca — vedi agents/outreach-agent.ts. Elenco statico: non
// cambia, nessuna chiamata API necessaria per generarlo.
export interface Provincia {
  sigla: string;
  nome: string;
  regione: string;
  capoluogo: string;
}

export const PROVINCE: Provincia[] = [
  // Piemonte
  { sigla: "AL", nome: "Alessandria", regione: "Piemonte", capoluogo: "Alessandria" },
  { sigla: "AT", nome: "Asti", regione: "Piemonte", capoluogo: "Asti" },
  { sigla: "BI", nome: "Biella", regione: "Piemonte", capoluogo: "Biella" },
  { sigla: "CN", nome: "Cuneo", regione: "Piemonte", capoluogo: "Cuneo" },
  { sigla: "NO", nome: "Novara", regione: "Piemonte", capoluogo: "Novara" },
  { sigla: "TO", nome: "Torino", regione: "Piemonte", capoluogo: "Torino" },
  { sigla: "VB", nome: "Verbano-Cusio-Ossola", regione: "Piemonte", capoluogo: "Verbania" },
  { sigla: "VC", nome: "Vercelli", regione: "Piemonte", capoluogo: "Vercelli" },
  // Liguria
  { sigla: "GE", nome: "Genova", regione: "Liguria", capoluogo: "Genova" },
  { sigla: "IM", nome: "Imperia", regione: "Liguria", capoluogo: "Imperia" },
  { sigla: "SP", nome: "La Spezia", regione: "Liguria", capoluogo: "La Spezia" },
  { sigla: "SV", nome: "Savona", regione: "Liguria", capoluogo: "Savona" },
  // Lombardia
  { sigla: "BG", nome: "Bergamo", regione: "Lombardia", capoluogo: "Bergamo" },
  { sigla: "BS", nome: "Brescia", regione: "Lombardia", capoluogo: "Brescia" },
  { sigla: "CO", nome: "Como", regione: "Lombardia", capoluogo: "Como" },
  { sigla: "CR", nome: "Cremona", regione: "Lombardia", capoluogo: "Cremona" },
  { sigla: "LC", nome: "Lecco", regione: "Lombardia", capoluogo: "Lecco" },
  { sigla: "LO", nome: "Lodi", regione: "Lombardia", capoluogo: "Lodi" },
  { sigla: "MN", nome: "Mantova", regione: "Lombardia", capoluogo: "Mantova" },
  { sigla: "MI", nome: "Milano", regione: "Lombardia", capoluogo: "Milano" },
  { sigla: "MB", nome: "Monza e della Brianza", regione: "Lombardia", capoluogo: "Monza" },
  { sigla: "PV", nome: "Pavia", regione: "Lombardia", capoluogo: "Pavia" },
  { sigla: "SO", nome: "Sondrio", regione: "Lombardia", capoluogo: "Sondrio" },
  { sigla: "VA", nome: "Varese", regione: "Lombardia", capoluogo: "Varese" }
];
