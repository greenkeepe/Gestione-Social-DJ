// Risposte basate solo su fatti confermati in config/brand.json.
// Dove l'informazione non è nota (tempistiche, prezzi), si rimanda al contatto diretto.

export type FaqItem = {
  question: string;
  answer: string;
};

export const faqItems: FaqItem[] = [
  {
    question: "Quanto tempo prima bisogna prenotare?",
    answer:
      "Le tempistiche dipendono dal periodo e dalla data richiesta. Il modo più rapido per saperlo è verificare la disponibilità per la tua data specifica.",
  },
  {
    question: "Come posso verificare la disponibilità?",
    answer:
      "Compila il modulo qui sotto con data, location e tipo di evento, oppure scrivi direttamente su WhatsApp: riceverai una risposta con la disponibilità per la tua data.",
  },
  {
    question: "Fate matrimoni?",
    answer:
      "Sì, i matrimoni sono una parte centrale dell'attività: dalla cerimonia al fine serata, inclusi ricevimenti in relais, ristoranti, club house e location analoghe.",
  },
  {
    question: "Vi occupate anche della cerimonia?",
    answer:
      "Sì, è possibile curare la musica della cerimonia (anche in chiesa) e gli interventi parlati, con microfoni dedicati.",
  },
  {
    question: "È possibile scegliere la musica?",
    answer:
      "Sì. La playlist viene costruita su misura insieme agli sposi o a chi organizza l'evento, con un incontro di pianificazione prima della data, e viene poi adattata dal vivo leggendo la pista.",
  },
  {
    question: "Portate voi l'impianto audio?",
    answer:
      "Sì, l'impianto audio professionale è incluso e viene dimensionato in base alla location e al numero di invitati.",
  },
  {
    question: "Vi occupate delle luci?",
    answer:
      "Sì, il servizio include un impianto luci pensato per accompagnare i diversi momenti della serata.",
  },
  {
    question: "Fate eventi aziendali?",
    answer:
      "Sì, feste aziendali, ricevimenti e inaugurazioni rientrano tra le tipologie di evento seguite abitualmente.",
  },
  {
    question: "Fate feste private?",
    answer:
      "Sì: compleanni, anniversari, diciottesimi, addii al nubilato/celibato e feste private in genere.",
  },
  {
    question: "Sono disponibili servizi aggiuntivi?",
    answer:
      "Sì: oltre al DJ set, sono disponibili impianto audio, luci, macchina del fumo e microfoni per interventi e cerimonia. Scrivici per capire cosa serve al tuo evento.",
  },
  {
    question: "Come viene organizzata la musica del matrimonio?",
    answer:
      "Attraverso un incontro di pianificazione in cui si definiscono insieme i momenti chiave (cerimonia, aperitivo, cena, party) e le preferenze musicali, poi adattati dal vivo il giorno stesso.",
  },
  {
    question: "Come posso richiedere un preventivo?",
    answer:
      "Compila il modulo di contatto con i dettagli del tuo evento, oppure scrivi su WhatsApp o via email: riceverai una proposta su misura.",
  },
];
