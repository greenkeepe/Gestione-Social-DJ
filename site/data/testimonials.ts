// Recensioni reali fornite direttamente dal cliente (Andrea / Forte DJ).
// Nessun testo qui è inventato o parafrasato oltre a piccoli adattamenti
// editoriali dichiarati inline dove presenti. Tutte a 5 stelle, coerenti
// con siteConfig.ratingValue.

export type Testimonial = {
  name: string;
  eventType: string;
  date: string;
  quote: string;
};

export const testimonials: Testimonial[] = [
  {
    name: "Chiara R.",
    eventType: "Matrimonio",
    date: "07/2026",
    quote:
      "Un DJ fantastico! Avevamo un pubblico internazionale e ha fatto ballare tutti per tutta la notte, passando con grande naturalezza da una lingua all'altra e da uno stile musicale all'altro. Lo hanno amato tutti!",
  },
  {
    name: "Marta G.",
    eventType: "Wedding",
    date: "07/2026",
    quote:
      "Eccezionale, professionalità al top e grandissima flessibilità. Ha fatto divertire tutti gli invitati e la festa finale è stata pazzesca. Rapporto qualità-prezzo imbattibile per un professionista di questo livello. Non avremmo potuto fare scelta migliore per il nostro giorno speciale!",
  },
  {
    name: "Martino F.",
    eventType: "Matrimonio",
    date: "09/2025",
    quote:
      "Molto disponibile e flessibile. Molti ospiti mi hanno fatto i complimenti per il Dj. Molto forte.",
  },
  {
    name: "Sabrina & Marlon U.",
    eventType: "Matrimonio",
    date: "09/2025",
    quote:
      "Grazie mille Andrea per essere stata presente per tutto il giorno del nostro matrimonio! È stato più che meraviglioso e tu ne hai fatto parte in modo fondamentale! Hai suonato esattamente la musica che ci rappresentava e ci siamo divertiti un mondo a ballare per tutto il giorno! Speriamo che abbiate apprezzato i nostri gusti musicali, anche noi ci siamo divertiti a vedervi ballare a ritmo di musica. Saluti dalla Germania, Sabrina e Marlon.",
  },
  {
    name: "Antonio S.",
    eventType: "Party estivo",
    date: "09/2025",
    quote:
      "Che dire… Andrea ha fatto decollare il party! Musica perfetta, ritmo sempre giusto e una carica pazzesca che ci ha fatto ballare fino all'ultima canzone. Super disponibile, simpatico e con un'ottima capacità di leggere la pista e coinvolgere tutti. Abbiamo ballato e ci siamo divertiti tantissimo.",
  },
  {
    name: "Jonathan E.",
    eventType: "Wedding",
    date: "08/2025",
    quote:
      "We couldn't have asked for a better DJ for our wedding! Andrea (DJ Forte) truly made our special day unforgettable. From the ceremony to the last song on the dance floor, he created the perfect soundtrack for every moment. During the cocktail hour, the music was elegant and set the mood beautifully, and when it came time to party, the energy was through the roof! Andrea knew exactly how to read the crowd and kept everyone — from our parents to our friends — dancing all night long. We, Emma and Jonathan, will always remember how our first dance felt magical thanks to his music selection. Many of our guests even told us it was the best wedding party they've ever been to. If you want a professional, talented, and passionate DJ who will make your event truly special, Andrea is the one to book. Highly recommended!",
  },
  {
    name: "Giuseppe T.",
    eventType: "18°",
    date: "06/2025",
    quote:
      "Il DJ ha fatto un lavoro assurdo, ha fatto ballare tutti dal primo pezzo all'ultimo! Musica perfetta, zero pause noiose, solo energia e divertimento. Ha capito al volo che vibe volevamo. Grazie di cuore, hai reso i miei 18 un ricordo indimenticabile!",
  },
  {
    name: "Antonella e Marco M.",
    eventType: "Matrimonio",
    date: "06/2025",
    quote:
      "Andrea è stato fantastico! Ha reso il nostro matrimonio una vera festa! Musica perfetta in ogni momento, ha fatto ballare tutti e creato un'atmosfera magica. Simpatico, professionale e super coinvolgente. Non potevamo chiedere di meglio. Grazie di cuore Andrea!",
  },
  {
    name: "Angelo B.",
    eventType: "Compleanno",
    date: "06/2025",
    quote:
      "Andrea ha reso il mio 50° compleanno una festa pazzesca! Musica perfetta, pista sempre piena e tanta energia. Ha saputo coinvolgere tutti con gusto e simpatia.",
  },
  {
    name: "Eventi Milano E.",
    eventType: "Campari",
    date: "06/2025",
    quote:
      "Dall'aperitivo al party, la musica ha rispecchiato in pieno l'identità del brand: elegante, vibrante e con quel tocco inconfondibile di carattere. Ha gestito tutto con grande professionalità, ma sempre con il sorriso e una vibe super positiva. Ospiti felici, pista piena e tantissimi complimenti!",
  },
  {
    name: "Alessandro D.",
    eventType: "Matrimonio",
    date: "06/2025",
    quote:
      "Che dire… semplicemente fantastico! Ha fatto ballare tutti, ma proprio tutti! Dai nostri amici scatenati agli zii più timidi. La musica era sempre perfetta al momento giusto: romantica durante la cerimonia, coinvolgente durante l'aperitivo, e poi… una festa pazzesca! Super disponibile, simpatico, e sempre con il sorriso. Ci ha fatto sentire tranquilli fin dal primo incontro e ha capito al volo lo stile che volevamo per il nostro giorno.",
  },
  {
    name: "Marta F.",
    eventType: "Compleanno",
    date: "10/2024",
    quote:
      "Se volete una serata indimenticabile, lui è il DJ giusto! Grazie di tutto! Onesto, divertente e disponibilissimo!",
  },
  {
    name: "Anna F.",
    eventType: "Compleanno",
    date: "10/2024",
    quote:
      "Andrea è stato pazzesco! Ha mixato alla grande, tenendo tutti carichi dall'inizio alla fine. Ogni pezzo era perfetto, passando dai classici alle hit di adesso, e ha capito al volo cosa ci piaceva. Anche quelli che di solito non ballano si sono scatenati! Serata top, DJ super consigliato.",
  },
  {
    name: "Sergio C.",
    eventType: "Matrimonio",
    date: "09/2024",
    quote:
      "Ha reso il nostro matrimonio magico! Ha creato la colonna sonora perfetta per ogni momento, dalla cerimonia alla festa. Ha fatto ballare tutti, dai più piccoli agli adulti, con una selezione musicale impeccabile. Professionalità, energia e grande intuizione: lo consiglieremmo a chiunque voglia un matrimonio indimenticabile!",
  },
  {
    name: "Martina M.",
    eventType: "Evento aziendale",
    date: "09/2024",
    quote:
      "Andrea ha trasformato il nostro evento aziendale in una serata indimenticabile! La sua selezione musicale ha coinvolto tutti e creato l'atmosfera perfetta. Professionale, intuitivo e sempre sul pezzo, è stato un vero piacere lavorare con lui. Super consigliato!",
  },
  {
    name: "Vittorio S.",
    eventType: "Diciottesimo",
    date: "09/2024",
    quote:
      "DJ di qualità, molto professionale si inserisce perfettamente nell'atmosfera dell'evento trasformandolo in un momento unico. Molto bravo, disponibile a soddisfare qualsiasi richiesta di genere musicale senza problemi. Consigliatissimo.",
  },
  {
    name: "Marco B.",
    eventType: "Evento privato",
    date: "09/2024",
    quote:
      "Abbiamo chiamato DJ Andrea per la nostra festa privata ed è stato il colpo di scena della serata! Ha creato subito l'atmosfera giusta con la sua musica, e ha fatto ballare tutti fino a tarda notte. È stato super attento ai gusti di tutti e ha saputo mixare le canzoni in modo perfetto. Se volete una festa indimenticabile, Andrea è il DJ che fa per voi. Lo consiglio vivamente! Grazie mille, Andrea!",
  },
  {
    name: "Antonella M.",
    eventType: "Matrimonio",
    date: "09/2024",
    quote:
      "Andrea è stato straordinario al nostro matrimonio! Ha creato l'atmosfera ideale durante l'aperitivo e ha fatto scatenare tutti sulla pista da ballo. La sua selezione musicale è stata impeccabile, soddisfacendo i gusti di tutti i presenti. Andrea è stato professionale, disponibile e ha saputo adattarsi perfettamente all'energia degli invitati. Grazie a lui, la nostra festa è stata un successo indimenticabile. Non possiamo che raccomandarlo a chiunque cerchi un DJ per un evento speciale! Grazie mille, Andrea!",
  },
  {
    name: "Pietro S.",
    eventType: "Matrimonio",
    date: "07/2024",
    quote:
      "Abbiamo ingaggiato Andrea per il nostro matrimonio, è stato estremamente disponibile e flessibile accogliendo le nostre richieste; è capace di invogliare le persone a ballare e sa coordinarsi perfettamente col personale della struttura durante tutto il matrimonio. Ha reso il matrimonio una festa danzante in cui tutti gli invitati si sono divertiti. Il compenso richiesto per il servizio offerto è onesto.",
  },
  {
    name: "Federica D.",
    eventType: "Matrimonio",
    date: "07/2024",
    quote:
      "Andrea è un bravissimo dj. Molto disponibile, simpatico e professionale. Con lui il divertimento è assicurato. Riesce a far ballare tutti gli invitati e di tutte le età. Super consigliato.",
  },
  {
    name: "Alessandra G.",
    eventType: "Matrimonio",
    date: "07/2024",
    quote:
      "Questo è il DJ perfetto per i matrimoni. Non solo la selezione della musica è impeccabile, la sua capacità di coordinarsi con la location e il catering è stata chiave nel far sì che la festa prendesse piede da subito! Ogni singolo momento di pausa diventava immediatamente party! Uno dei matrimoni migliori a cui sia stata ed in gran parte merito suo! Grazie mille!",
  },
  {
    name: "Umberto B.",
    eventType: "Diciottesimo",
    date: "07/2024",
    quote:
      "Andrea ha suonato quest'estate al mio diciottesimo ed è stato davvero spettacolare, varia tra tutti i generi di musica a seconda delle tue preferenze. A parer mio prezzo anche basso per il tipo di servizio fornito.",
  },
  {
    name: "Irene B.",
    eventType: "Matrimonio",
    date: "06/2024",
    quote:
      "Ci siamo rivolti a lui per la serata del nostro matrimonio, molto professionale, simpatico e disponibile nell'ascoltare le nostre richieste e proporre ottima musica. Ci ha fatto ballare e divertire per tutta la sera! Super consigliato.",
  },
  {
    name: "Lara B.",
    eventType: "Diciottesimo",
    date: "06/2024",
    quote: "Bellissima festa Andrea ha fatto ballare tutti ci siamo divertiti un sacco!",
  },
  {
    name: "Massimo B.",
    eventType: "Compleanno figlio",
    date: "06/2024",
    quote:
      "Ci siamo trovati molto bene, Andrea ha uno spirito e una voglia di far divertire le persone che ci ha lasciati entusiasti, riesce a far ballare chiunque, molto disponibile su qualsiasi tipo di canzone gli si chieda. Lo consiglio vivamente a chi come noi piace fare festa.",
  },
  {
    name: "Giorgia G.",
    eventType: "Matrimonio",
    date: "02/2024",
    quote:
      "Il nostro matrimonio è stato un vero spettacolo! Con la sua selezione musicale perfetta e il talento nel farci ballare fino all'alba, ha reso la nostra giornata ancora più speciale! Grazie Andrea! Straconsigliato!",
  },
  {
    name: "Sara F.",
    eventType: "Compleanno",
    date: "02/2024",
    quote:
      "Un compleanno da urlo grazie al nostro DJ! Con la sua musica contagiosa ha trasformato la mia festa in un'esplosione di divertimento! Non avrei potuto chiedere di più per celebrare i miei 18 anni. Grazie per aver reso la serata indimenticabile!",
  },
  {
    name: "Marina M.",
    eventType: "18° compleanno",
    date: "02/2024",
    quote:
      "Andrea ha trasformato il mio 18° compleanno in una festa che non dimenticherò mai! Con la sua musica travolgente e il suo entusiasmo contagioso, ha fatto ballare tutti fino all'alba. Grazie per aver reso la mia festa così speciale e divertente!",
  },
  {
    name: "Alberto F.",
    eventType: "Matrimonio",
    date: "02/2024",
    quote:
      "Un matrimonio da sogno grazie al DJ! Con la sua selezione musicale impeccabile e la sua capacità di tenere alta l'energia della festa, ha reso la nostra giornata ancora più speciale. Non potevamo chiedere di più! Grazie per aver reso il nostro matrimonio indimenticabile!",
  },
  {
    name: "Luca E.",
    eventType: "Compleanno",
    date: "01/2024",
    quote:
      "Il DJ ha reso il mio compleanno assolutamente fantastico! La sua selezione musicale coinvolgente ha mantenuto l'energia alta per tutta la festa. Grazie ForteDJ per aver trasformato la mia celebrazione in un evento memorabile!",
  },
  {
    name: "Serena A.",
    eventType: "Matrimonio",
    date: "01/2024",
    quote:
      "Non possiamo fare altro che elogiare Andrea per aver trasformato il nostro matrimonio in un'esperienza musicale straordinaria. La sua professionalità, comunicazione chiara e attenzione ai dettagli hanno reso il processo senza problemi. Dalla cerimonia al cocktail, la sua selezione musicale impeccabile ha mantenuto l'atmosfera perfetta. Grazie per aver contribuito a rendere il nostro giorno così speciale!",
  },
  {
    name: "Marta S.",
    eventType: "Party",
    date: "01/2024",
    quote:
      "ForteDJ ha reso la nostra festa privata un successo totale! La sua musica coinvolgente ha mantenuto tutti sulla pista da ballo fino alla fine. Professionale, energico e con un tocco magico, consiglio Dj ForteDJ a chiunque cerchi un'esperienza musicale straordinaria per la propria festa. Cinque stelle meritate!",
  },
  {
    name: "Raffaella D.",
    eventType: "Festa 50 anni",
    date: "11/2023",
    quote:
      "Andrea è stato fantastico, professionale, puntuale, affidabilissimo. Un grande professionista e una persona umanamente squisita. Ha esaudito tutti i miei (numerosissimi) desideri senza batter ciglio e ha reso la festa indimenticabile per tutti, dai senior di 70 anni ai piccoli di 5 anni! Grazie Andrea!",
  },
  {
    name: "Veronic C.",
    eventType: "Festa privata",
    date: "09/2023",
    quote:
      "Grazie Andrea! Ci hai regalato una musica strepitosa da ballare per tutta la notte. Un abbraccio.",
  },
  {
    name: "Maria Francesca F.",
    eventType: "Festa in Monferrato",
    date: "09/2023",
    quote:
      "Andrea mi ha fatto divertire come non mi capitava da secoli. Tra brani vecchi e nuovi, la sua selezione è stata quella che mi piacerebbe ascoltare ad ogni festa danzante!",
  },
  {
    name: "Miriam B.",
    eventType: "Festa privata",
    date: "09/2023",
    quote: "Ci ha fatto tutti ballare e divertire senza sosta, come Baccanti nel bosco!",
  },
  {
    name: "Roberto P.",
    eventType: "Festa privata",
    date: "09/2023",
    quote:
      "Ha saputo suscitare l'entusiasmo ballerino dei numerosi presenti, resuscitando alle danze anche i più restii, tra cui il sottoscritto. Grazie!",
  },
  {
    name: "Alessandra T.",
    eventType: "Festa nel Monferrato",
    date: "09/2023",
    quote:
      "Ho conosciuto Andrea alla festa di un'amica e mi è piaciuto subito. L'ho contattato per portare la sua musica ad una festa che avevo organizzato per un gruppo di 60 persone. Ha scatenato anche i più 'nerd', ci siamo divertiti tantissimo e ha messo la musica più bella di tutti i tempi.",
  },
  {
    name: "Luca E.",
    eventType: "Compleanno 18",
    date: "09/2023",
    quote:
      "Ha fatto brillare il mio 18º compleanno! La sua musica ha dato vita alla festa, mantenendo l'energia al massimo e facendoci ballare senza sosta. Grazie mille per una serata indimenticabile!",
  },
  {
    name: "Serena C.",
    eventType: "Matrimonio",
    date: "09/2023",
    quote:
      "Il nostro matrimonio è stato reso ancora più speciale grazie al talento straordinario di ForteDJ. Fin dall'inizio, ha creato un'atmosfera magica con una selezione musicale impeccabile durante il cocktail e la cena, per poi alzare l'energia della festa quando è arrivato il momento di ballare, tenendo la pista sempre viva con mix coinvolgenti. La sua abilità nel leggere il pubblico è stata straordinaria, garantendo che tutti, dai più giovani agli anziani, si divertissero. Andrea ha reso il nostro matrimonio unico e memorabile grazie alla sua passione per la musica e al suo talento eccezionale.",
  },
  {
    name: "Marta F.",
    eventType: "Party",
    date: "09/2023",
    quote:
      "La festa che ho organizzato è diventata un evento straordinario grazie al talento unico di ForteDJ. Ha tenuto tutti in pista tutta la notte con la sua musica eclettica e le sue abilità straordinarie. Andrea ha saputo creare un'atmosfera magica e coinvolgente che ha reso la mia festa indimenticabile.",
  },
  {
    name: "Cristina R.",
    eventType: "Matrimonio",
    date: "09/2023",
    quote:
      "Abbiamo contattato Andrea dopo aver letto le ottime recensioni. Le nostre aspettative erano molto alte e dobbiamo riconoscere che non sono state deluse, anzi! Fin dal primo momento si è dimostrato super disponibile e attento a ogni nostra esigenza musicale. Con grande maestria è riuscito ad animare la nostra festa con musica adeguata in ogni momento: delicate musiche d'atmosfera per i momenti che richiedevano la conversazione, canzoni coinvolgenti per lo svago, per finire con le hit che spaccano per ballare tutta la notte! Consigliatissimo per la sua grande empatia e professionalità!",
  },
  {
    name: "Claudia M.",
    eventType: "Cena con musica",
    date: "09/2023",
    quote:
      "Andrea ha accompagnato con le sue compilation una serata di cena con danze tra amici. Ha capito le nostre esigenze e ci siamo veramente divertiti. Grazie!",
  },
  {
    name: "Giovanna S.",
    eventType: "Matrimonio",
    date: "06/2023",
    quote:
      "Ho conosciuto Andrea casualmente su internet con una classica ricerca 'dj matrimonio'. Dalla prima telefonata mi è piaciuto subito e la mia impressione è stata confermata al nostro matrimonio: gentile, empatico, professionale e super disponibile. Ha soddisfatto in pieno le nostre aspettative e quelle dei nostri ospiti, che si sono letteralmente scatenati.",
  },
  {
    name: "Martina M.",
    eventType: "Matrimonio",
    date: "06/2023",
    quote:
      "Il DJ al nostro matrimonio è stato semplicemente eccezionale! Ha saputo creare l'atmosfera perfetta, con una selezione musicale che ha fatto ballare tutti i nostri ospiti. La sua professionalità e la sua capacità di coinvolgere il pubblico hanno reso la serata indimenticabile. Grazie al suo talento e alla sua abilità nel gestire i tempi, il nostro matrimonio è stato un vero successo. Grazie Andrea.",
  },
  {
    name: "Francesco M.",
    eventType: "Festa di compleanno",
    date: "06/2023",
    quote:
      "Non posso che esprimere la mia più grande soddisfazione per l'incredibile performance del DJ alla festa di compleanno che ho organizzato di recente. È stato semplicemente straordinario sotto ogni aspetto, regalando a tutti gli invitati una serata indimenticabile! L'esperienza e la professionalità del DJ sono state evidenti fin dal primo momento: ha dimostrato una profonda conoscenza della musica, spaziando tra diversi generi e creando un mix perfetto che ha mantenuto l'energia alta per tutta la serata, adattando la selezione musicale all'atmosfera della festa. È stato anche un vero professionista nell'interazione con il pubblico, incoraggiando tutti a ballare, cantare e divertirsi, di tutte le età e i diversi gusti musicali. L'organizzazione e la puntualità sono state impeccabili: arrivato in anticipo, ha gestito in modo fluido le transizioni tra i brani, creando un flusso musicale coerente senza interruzioni. Consiglio vivamente questo DJ per qualsiasi tipo di evento.",
  },
  {
    name: "Giovanni G.",
    eventType: "Matrimonio",
    date: "03/2023",
    quote:
      "Ho chiamato Andrea una settimana prima dell'evento e già telefonicamente ho capito con chi avevo a che fare. Avendo io esperienza in animazione di villaggi, radio e serate, capisco subito con chi ho a che fare e sono molto esigente: le mie richieste sono state accolte con professionalità e capacità. Ha messo al servizio di tutti gli invitati una grande capacità di empatia, mostrando capacità e professionalità come poche viste finora. Non lo consiglio semplicemente: vi invito a scegliere direttamente lui per rendere il vostro evento indimenticabile.",
  },
  {
    name: "Stefania L.",
    eventType: "18esimo",
    date: "03/2023",
    quote:
      "Due giorni fa c'è stato il 18esimo di mia figlia e Andrea ha animato la festa con la sua musica. Con grande entusiasmo ma anche garbo e professionalità ha creato un'atmosfera meravigliosa! Abilissimo nella scelta dei pezzi giusti e dei tempi giusti per ciascun momento, i ragazzi hanno ballato come matti tutta la notte: è stato determinante perché la festa fosse indimenticabile!",
  },
  {
    name: "Mina A.",
    eventType: "Festa di matrimonio",
    date: "01/2023",
    quote:
      "Ho partecipato ad altre feste di matrimonio ma come in questa, dove la maestria di Andrea con il suo stile e la sua musica ha fatto ballare e divertire tutti i partecipanti, compresi quelli che solitamente rimangono attaccati alla sedia. Andrea, il tuo nome è una garanzia, sei fortissimo.",
  },
  {
    name: "Giorgia F.",
    eventType: "Diciottesimo",
    date: "01/2023",
    quote:
      "Andrea è stato davvero eccezionale! Ha saputo soddisfare i gusti musicali dei ragazzi, alternando al momento giusto i vari brani. Disponibile e simpatico, sicuramente fondamentale per la riuscita dell'evento.",
  },
];
