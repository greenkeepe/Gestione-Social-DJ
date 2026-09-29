import { redirect } from "next/navigation";

// "Crea Reel AI" è stata unita a "Carica" (una sola pagina per foto e
// video): il vecchio indirizzo porta lì, così i link salvati funzionano ancora.
export default function ReelAiPage() {
  redirect("/carica");
}
