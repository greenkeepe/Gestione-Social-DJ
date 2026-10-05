"use client";

import { useActionState, useEffect, useRef, useState } from "react";
import { useFormStatus } from "react-dom";
import Image from "next/image";
import { CheckCircle2, Loader2, AlertCircle, ChevronLeft, ChevronRight } from "lucide-react";
import {
  submitWeddingPlannerForm,
  type WeddingPlannerState,
} from "@/app/actions/weddingPlanner";
import { weddingPlannerGenreOptions } from "@/lib/validation";
import { cn } from "@/lib/utils";

const inputClasses =
  "w-full rounded-lg border border-line bg-charcoal px-4 py-3 text-ivory placeholder:text-ivory-dim/50 outline-none transition-colors focus:border-champagne";

const textareaClasses = cn(inputClasses, "resize-none");

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

function FieldError({ messages }: { messages?: string[] }) {
  if (!messages?.length) return null;
  return (
    <p className="mt-1.5 flex items-center gap-1.5 text-xs text-red-400" role="alert">
      <AlertCircle className="h-3.5 w-3.5" aria-hidden />
      {messages[0]}
    </p>
  );
}

function TextField({
  id,
  label,
  type = "text",
  required,
  errors,
  onFieldBlur,
}: {
  id: string;
  label: string;
  type?: string;
  required?: boolean;
  errors?: string[];
  onFieldBlur?: (id: string, value: string) => void;
}) {
  return (
    <div>
      <label htmlFor={id} className="mb-2 block text-sm text-ivory-dim">
        {label}
        {required ? " *" : ""}
      </label>
      <input
        id={id}
        name={id}
        type={type}
        className={inputClasses}
        onBlur={onFieldBlur ? (e) => onFieldBlur(id, e.target.value) : undefined}
      />
      <FieldError messages={errors} />
    </div>
  );
}

// Un'immagine reale per step, scelta per restare coerente con il momento
// che si sta compilando (niente foto a caso): niente per il passo "Gli
// sposi", dove una foto genererebbe solo rumore.
const STEP_IMAGES: Record<string, { src: string; alt: string }> = {
  evento: { src: "/images/hero-ceremony.jpg", alt: "Allestimento di una cerimonia di matrimonio con vista sulle colline" },
  location: { src: "/images/gallery/wedding-terrace-booth-hills.jpg", alt: "Consolle allestita in terrazza con vista sulle colline" },
  cerimonia: { src: "/images/gallery/wedding-ceremony-arch-hills.jpg", alt: "Cerimonia con arco floreale e vista sulle colline" },
  festa: { src: "/images/gallery/wedding-reception-dance.jpg", alt: "Balli al ricevimento con luci scenografiche" },
  generi: { src: "/images/gallery/party-foggy-dancefloor.jpg", alt: "Pista da ballo tra luci e fumo scenico" },
};

const STEPS = [
  { key: "evento", title: "L'evento" },
  { key: "sposi", title: "Gli sposi" },
  { key: "location", title: "Location" },
  { key: "cerimonia", title: "Cerimonia" },
  { key: "festa", title: "La festa" },
  { key: "generi", title: "Generi e mood" },
] as const;

// Mappa ogni campo al suo step: usata sia per il controllo "campi
// obbligatori" prima di avanzare, sia per riportare l'utente sul passo
// giusto se il server rifiuta la validazione.
const FIELD_STEP: Record<string, number> = {
  email: 0,
  telefono: 0,
  weddingDate: 0,
  eventTime: 0,
  brideName: 1,
  brideSurname: 1,
  groomName: 1,
  groomSurname: 1,
  venueName: 2,
  venueAddress: 2,
  cerimoniaInLoco: 3,
  ceremonyStartTime: 3,
  ceremonyEntranceSong: 3,
  ceremonyRingSong: 3,
  ceremonyExitSong: 3,
  partyStartTime: 4,
  receptionEntranceSong: 4,
  cakeCuttingSong: 4,
  slowDanceSong: 4,
  genres: 5,
  otherGenres: 5,
  avoid: 5,
  notes: 5,
};

const REQUIRED_BY_STEP: Record<number, { id: string; label: string }[]> = {
  0: [
    { id: "email", label: "Email" },
    { id: "weddingDate", label: "Data matrimonio" },
    { id: "eventTime", label: "Ora evento" },
  ],
  1: [
    { id: "brideName", label: "Nome sposa" },
    { id: "brideSurname", label: "Cognome sposa" },
    { id: "groomName", label: "Nome sposo" },
    { id: "groomSurname", label: "Cognome sposo" },
  ],
  2: [
    { id: "venueName", label: "Nome location" },
    { id: "venueAddress", label: "Indirizzo location" },
  ],
};

function SubmitButton() {
  const { pending } = useFormStatus();
  return (
    <button
      type="submit"
      disabled={pending}
      className="inline-flex w-full items-center justify-center gap-2 rounded-full bg-champagne px-8 py-4 text-base font-medium text-ink transition-all duration-300 hover:bg-champagne-bright disabled:opacity-60 sm:w-auto"
    >
      {pending ? (
        <>
          <Loader2 className="h-4 w-4 animate-spin" aria-hidden />
          Invio…
        </>
      ) : (
        "Invia il questionario"
      )}
    </button>
  );
}

const initialState: WeddingPlannerState = { status: "idle" };

export function WeddingPlannerForm({ eventId }: { eventId: string }) {
  const boundAction = submitWeddingPlannerForm.bind(null, eventId);
  const [state, formAction] = useActionState(boundAction, initialState);
  const [stepIndex, setStepIndex] = useState(0);
  const [stepErrors, setStepErrors] = useState<string[]>([]);
  const [cerimoniaInLoco, setCerimoniaInLoco] = useState<"true" | "false">("true");
  const [erroriLive, setErroriLive] = useState<Record<string, string>>({});
  const topRef = useRef<HTMLDivElement>(null);

  // Validazione immediata di alcuni campi appena l'utente esce dal campo,
  // invece di scoprire il problema solo a invio fatto (o peggio, in fondo
  // ai passi del wizard).
  function validaCampo(id: string, value: string) {
    if (id === "email") {
      setErroriLive((prev) => {
        const next = { ...prev };
        if (value.trim() && !EMAIL_REGEX.test(value.trim())) next.email = "Questa email non sembra valida.";
        else delete next.email;
        return next;
      });
    }
  }

  // Se il server rifiuta la validazione, salta sul passo del primo campo
  // sbagliato, così l'utente vede subito cosa correggere.
  useEffect(() => {
    if (state.status === "error" && state.fieldErrors) {
      const primaChiave = Object.keys(state.fieldErrors)[0];
      const passo = FIELD_STEP[primaChiave];
      if (passo !== undefined) setStepIndex(passo);
    }
  }, [state]);

  // Dopo l'invio (successo o errore) riporta sempre in cima: su smartphone,
  // dopo aver scrollato fino in fondo per premere "Invia", altrimenti il
  // risultato potrebbe restare fuori dallo schermo e sembrare che "non sia
  // successo niente".
  useEffect(() => {
    if (state.status === "success" || state.status === "error") {
      topRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
    }
  }, [state]);

  function scrollToTop() {
    topRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
  }

  function vaiAvanti() {
    const richiesti = [...(REQUIRED_BY_STEP[stepIndex] ?? [])];
    if (stepIndex === 3 && cerimoniaInLoco === "true") {
      richiesti.push({ id: "ceremonyStartTime", label: "Orario inizio cerimonia" });
    }
    const mancanti = richiesti.filter(({ id }) => {
      const el = document.getElementById(id) as HTMLInputElement | null;
      return !el?.value.trim();
    });
    if (mancanti.length > 0) {
      setStepErrors(mancanti.map((m) => `${m.label} è obbligatorio.`));
      return;
    }
    if (erroriLive.email && stepIndex === 0) {
      setStepErrors(["Controlla l'email inserita."]);
      return;
    }
    setStepErrors([]);
    setStepIndex((i) => Math.min(i + 1, STEPS.length - 1));
    scrollToTop();
  }

  function vaiIndietro() {
    setStepErrors([]);
    setStepIndex((i) => Math.max(i - 1, 0));
    scrollToTop();
  }

  if (state.status === "success") {
    return (
      <div ref={topRef} role="status" className="flex flex-col items-center gap-4 rounded-2xl border border-champagne/40 bg-charcoal-soft p-10 text-center shadow-[0_0_40px_-10px_rgba(201,168,118,0.35)]">
        <CheckCircle2 className="h-12 w-12 text-champagne" aria-hidden />
        <p className="eyebrow">✅ Inviato con successo</p>
        <h2 className="font-display text-2xl text-ivory">Questionario ricevuto, grazie!</h2>
        <p className="max-w-md text-sm text-ivory-dim">
          Andrea ha ricevuto tutti i dettagli e li userà per costruire la colonna sonora del vostro giorno. Vi
          abbiamo mandato anche un riepilogo via email. Per qualsiasi aggiunta o modifica, scrivi pure su WhatsApp.
        </p>
      </div>
    );
  }

  const step = STEPS[stepIndex];
  const isLastStep = stepIndex === STEPS.length - 1;

  return (
    <div ref={topRef} className="rounded-2xl border border-line bg-charcoal-soft p-6 sm:p-10">
      {/* Indicatore di avanzamento */}
      <div className="mb-8">
        <div className="flex items-center justify-between text-xs text-ivory-dim">
          <span>
            Passo {stepIndex + 1} di {STEPS.length}
          </span>
          <span className="text-champagne">{step.title}</span>
        </div>
        <div className="mt-2 h-1 w-full overflow-hidden rounded-full bg-ink">
          <div
            className="h-full bg-champagne transition-all duration-300"
            style={{ width: `${((stepIndex + 1) / STEPS.length) * 100}%` }}
          />
        </div>
      </div>

      {/* noValidate: la validazione la facciamo noi (vaiAvanti lato client,
          zod lato server) — quella nativa del browser, su campi che vivono
          in passi non visibili (display:none), blocca l'invio in silenzio
          (vedi commento più sotto sul form). */}
      <form action={formAction} noValidate className="flex flex-col gap-8">
        <input type="text" name="hp_field" tabIndex={-1} autoComplete="off" aria-hidden="true" className="hidden" />

        {state.status === "error" && state.message ? (
          <p role="alert" className="flex items-center gap-2 rounded-lg border border-red-400/40 bg-red-400/10 px-4 py-3 text-sm text-red-300">
            <AlertCircle className="h-4 w-4 shrink-0" aria-hidden />
            {state.message}
          </p>
        ) : null}

        {stepErrors.length > 0 && (
          <p role="alert" className="flex items-center gap-2 rounded-lg border border-red-400/40 bg-red-400/10 px-4 py-3 text-sm text-red-300">
            <AlertCircle className="h-4 w-4 shrink-0" aria-hidden />
            {stepErrors[0]}
          </p>
        )}

        {/* Tutti i passi restano montati nel form (display:none quando non
            attivi) così FormData, all'invio finale, contiene sempre tutti i
            campi compilati finora, non solo quelli dell'ultimo passo. */}
        {STEPS.map((s, index) => (
          <div key={s.key} style={{ display: index === stepIndex ? "block" : "none" }}>
            {STEP_IMAGES[s.key] ? (
              <div className="relative mb-6 aspect-[16/9] w-full overflow-hidden rounded-xl border border-line">
                <Image src={STEP_IMAGES[s.key].src} alt={STEP_IMAGES[s.key].alt} fill sizes="(max-width: 768px) 100vw, 640px" className="object-cover" />
              </div>
            ) : null}

            {s.key === "evento" && (
              <div className="grid gap-6 sm:grid-cols-2">
                <TextField id="email" label="Email" type="email" required errors={erroriLive.email ? [erroriLive.email] : state.fieldErrors?.email} onFieldBlur={validaCampo} />
                <TextField id="telefono" label="Telefono (facoltativo)" type="tel" />
                <TextField id="weddingDate" label="Data matrimonio / Wedding date" type="date" required errors={state.fieldErrors?.weddingDate} />
                <TextField id="eventTime" label="Ora / Event time" type="time" required errors={state.fieldErrors?.eventTime} />
              </div>
            )}

            {s.key === "sposi" && (
              <div className="grid gap-6 sm:grid-cols-2">
                <TextField id="brideName" label="Nome sposa / Bride name" required errors={state.fieldErrors?.brideName} />
                <TextField id="brideSurname" label="Cognome sposa / Bride surname" required errors={state.fieldErrors?.brideSurname} />
                <TextField id="groomName" label="Nome sposo / Groom name" required errors={state.fieldErrors?.groomName} />
                <TextField id="groomSurname" label="Cognome sposo / Groom surname" required errors={state.fieldErrors?.groomSurname} />
              </div>
            )}

            {s.key === "location" && (
              <>
                <p className="mb-4 text-sm text-ivory-dim">Inserisci la location dove avverrà l&apos;evento.</p>
                <div className="grid gap-6 sm:grid-cols-2">
                  <TextField id="venueName" label="Nome del locale / Location" required errors={state.fieldErrors?.venueName} />
                  <TextField id="venueAddress" label="Indirizzo (Via, Città) / Address" required errors={state.fieldErrors?.venueAddress} />
                </div>
              </>
            )}

            {s.key === "cerimonia" && (
              <>
                <fieldset className="mb-6">
                  <legend className="mb-2 block text-sm text-ivory-dim">
                    C&apos;è una cerimonia in loco con il DJ? / Is there an on-site ceremony with the DJ?
                  </legend>
                  <div className="flex gap-3">
                    <label className="flex cursor-pointer items-center gap-2 rounded-full border border-line px-4 py-2 text-sm text-ivory-dim transition-colors has-[:checked]:border-champagne has-[:checked]:text-champagne">
                      <input
                        type="radio"
                        name="cerimoniaInLoco"
                        value="true"
                        checked={cerimoniaInLoco === "true"}
                        onChange={() => setCerimoniaInLoco("true")}
                        className="h-3.5 w-3.5 accent-[color:var(--color-champagne)]"
                      />
                      Sì
                    </label>
                    <label className="flex cursor-pointer items-center gap-2 rounded-full border border-line px-4 py-2 text-sm text-ivory-dim transition-colors has-[:checked]:border-champagne has-[:checked]:text-champagne">
                      <input
                        type="radio"
                        name="cerimoniaInLoco"
                        value="false"
                        checked={cerimoniaInLoco === "false"}
                        onChange={() => setCerimoniaInLoco("false")}
                        className="h-3.5 w-3.5 accent-[color:var(--color-champagne)]"
                      />
                      No
                    </label>
                  </div>
                </fieldset>

                {cerimoniaInLoco === "true" && (
                  <div className="grid gap-6 sm:grid-cols-2">
                    <TextField id="ceremonyStartTime" label="Orario inizio cerimonia / Ceremony start time" type="time" required errors={state.fieldErrors?.ceremonyStartTime} />
                    <TextField id="ceremonyEntranceSong" label="Brano ingresso sposa / Song entrance bride" />
                    <TextField id="ceremonyRingSong" label="Brano scambio anelli / Ring exchange track" />
                    <TextField id="ceremonyExitSong" label="Brano fine cerimonia (uscita sposi) / End of ceremony song" />
                  </div>
                )}
              </>
            )}

            {s.key === "festa" && (
              <>
                <p className="mb-4 text-sm text-ivory-dim">
                  I brani essenziali per la festa — li usiamo nei momenti clou della serata.
                </p>
                <div className="grid gap-6 sm:grid-cols-2">
                  {cerimoniaInLoco === "false" && (
                    <TextField id="partyStartTime" label="Ora inizio evento / Event start time" type="time" />
                  )}
                  <TextField id="receptionEntranceSong" label="Brano ingresso sposi in sala" />
                  <TextField id="cakeCuttingSong" label="Brano taglio della torta" />
                  <TextField id="slowDanceSong" label="Brano primo ballo / First dance song" />
                </div>
              </>
            )}

            {s.key === "generi" && (
              <>
                <fieldset>
                  <legend className="mb-2 block text-sm text-ivory-dim">
                    Indica i generi che preferite / Select all that apply
                  </legend>
                  <div className="flex flex-wrap gap-3">
                    {weddingPlannerGenreOptions.map((genre) => (
                      <label
                        key={genre}
                        className="flex cursor-pointer items-center gap-2 rounded-full border border-line px-4 py-2 text-sm text-ivory-dim transition-colors has-[:checked]:border-champagne has-[:checked]:text-champagne"
                      >
                        <input type="checkbox" name="genres" value={genre} className="h-3.5 w-3.5 accent-[color:var(--color-champagne)]" />
                        {genre}
                      </label>
                    ))}
                  </div>
                </fieldset>

                <div className="mt-6 grid gap-6">
                  <TextField id="otherGenres" label="Altro / Other" />
                  <div>
                    <label htmlFor="avoid" className="mb-2 block text-sm text-ivory-dim">
                      Cosa EVITARE.... / What to AVOID....
                    </label>
                    <textarea id="avoid" name="avoid" rows={3} className={textareaClasses} />
                  </div>
                  <div>
                    <label htmlFor="notes" className="mb-2 block text-sm text-ivory-dim">
                      Varie ed eventuali / Miscellaneous
                    </label>
                    <textarea id="notes" name="notes" rows={4} className={textareaClasses} />
                  </div>
                </div>

                <p className="mt-8 text-center font-display text-xl text-champagne">
                  .......Ora siete pronti a fare FESTAAAA?? 🎉
                </p>
              </>
            )}
          </div>
        ))}

        <div className="flex flex-col-reverse gap-3 sm:flex-row sm:justify-between">
          {stepIndex > 0 ? (
            <button
              type="button"
              onClick={vaiIndietro}
              className="inline-flex items-center justify-center gap-2 rounded-full border border-ivory/30 px-6 py-3 text-sm text-ivory transition-colors hover:border-champagne hover:text-champagne"
            >
              <ChevronLeft className="h-4 w-4" aria-hidden /> Indietro
            </button>
          ) : (
            <span />
          )}

          {isLastStep ? (
            <SubmitButton />
          ) : (
            <button
              type="button"
              onClick={vaiAvanti}
              className="inline-flex items-center justify-center gap-2 rounded-full bg-champagne px-6 py-3 text-sm font-medium text-ink transition-all duration-300 hover:bg-champagne-bright"
            >
              Avanti <ChevronRight className="h-4 w-4" aria-hidden />
            </button>
          )}
        </div>
      </form>
    </div>
  );
}
