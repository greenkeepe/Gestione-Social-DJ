"use client";

import { useActionState } from "react";
import { useFormStatus } from "react-dom";
import { CheckCircle2, Loader2, AlertCircle } from "lucide-react";
import {
  submitWeddingPlannerForm,
  type WeddingPlannerState,
} from "@/app/actions/weddingPlanner";
import { weddingPlannerGenreOptions } from "@/lib/validation";
import { cn } from "@/lib/utils";

const inputClasses =
  "w-full rounded-lg border border-line bg-charcoal px-4 py-3 text-ivory placeholder:text-ivory-dim/50 outline-none transition-colors focus:border-champagne";

const textareaClasses = cn(inputClasses, "resize-none");

function FieldError({ messages }: { messages?: string[] }) {
  if (!messages?.length) return null;
  return (
    <p className="mt-1.5 flex items-center gap-1.5 text-xs text-red-400" role="alert">
      <AlertCircle className="h-3.5 w-3.5" aria-hidden />
      {messages[0]}
    </p>
  );
}

function SectionLabel({ title, subtitle }: { title: string; subtitle?: string }) {
  return (
    <div className="mb-6 border-b border-line pb-3">
      <h2 className="font-display text-xl text-champagne sm:text-2xl">{title}</h2>
      {subtitle ? <p className="mt-1 text-sm text-ivory-dim">{subtitle}</p> : null}
    </div>
  );
}

function TextField({
  id,
  label,
  type = "text",
  required,
  errors,
}: {
  id: string;
  label: string;
  type?: string;
  required?: boolean;
  errors?: string[];
}) {
  return (
    <div>
      <label htmlFor={id} className="mb-2 block text-sm text-ivory-dim">
        {label}
        {required ? " *" : ""}
      </label>
      <input id={id} name={id} type={type} required={required} className={inputClasses} />
      <FieldError messages={errors} />
    </div>
  );
}

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

export function WeddingPlannerForm() {
  const [state, formAction] = useActionState(submitWeddingPlannerForm, initialState);

  if (state.status === "success") {
    return (
      <div role="status" className="flex flex-col items-center gap-4 py-10 text-center">
        <CheckCircle2 className="h-10 w-10 text-champagne" aria-hidden />
        <h2 className="font-display text-2xl text-ivory">Questionario ricevuto, grazie!</h2>
        <p className="max-w-md text-sm text-ivory-dim">
          Andrea ha ricevuto tutti i dettagli e li userà per costruire la colonna sonora del vostro giorno. Per
          qualsiasi aggiunta o modifica, scrivi pure su WhatsApp.
        </p>
      </div>
    );
  }

  return (
    <form action={formAction} className="flex flex-col gap-12">
      {/* Honeypot anti-spam: display:none (non solo fuori schermo), è
          l'unico modo per cui autofill e gestori di password lo ignorano
          davvero invece di riempirlo comunque. */}
      <input
        type="text"
        name="hp_field"
        tabIndex={-1}
        autoComplete="off"
        aria-hidden="true"
        className="hidden"
      />

      {state.status === "error" && state.message ? (
        <p
          role="alert"
          className="flex items-center gap-2 rounded-lg border border-red-400/40 bg-red-400/10 px-4 py-3 text-sm text-red-300"
        >
          <AlertCircle className="h-4 w-4 shrink-0" aria-hidden />
          {state.message}
        </p>
      ) : null}

      <section>
        <SectionLabel title="L'evento / The event" />
        <div className="grid gap-6 sm:grid-cols-2">
          <TextField id="email" label="Email" type="email" required errors={state.fieldErrors?.email} />
          <TextField
            id="weddingDate"
            label="Data matrimonio / Wedding date"
            type="date"
            required
            errors={state.fieldErrors?.weddingDate}
          />
          <TextField id="eventTime" label="Ora / Event time" type="time" required errors={state.fieldErrors?.eventTime} />
        </div>
      </section>

      <section>
        <SectionLabel title="Contatti Sposa / Contact bride" />
        <div className="grid gap-6 sm:grid-cols-2">
          <TextField id="brideName" label="Nome / Name" required errors={state.fieldErrors?.brideName} />
          <TextField id="brideSurname" label="Cognome / Surname" required errors={state.fieldErrors?.brideSurname} />
          <TextField id="bridePhone" label="Telefono / Telephone number" type="tel" />
          <TextField id="brideEmail" label="Email" type="email" required errors={state.fieldErrors?.brideEmail} />
        </div>
        <p className="mb-2 mt-6 text-xs uppercase tracking-[0.2em] text-ivory-dim/60">
          Contatti social (facoltativo) / Social contacts (optional)
        </p>
        <div className="grid gap-6 sm:grid-cols-2">
          <TextField id="brideFacebook" label="Facebook" />
          <TextField id="brideInstagram" label="Instagram" />
        </div>
      </section>

      <section>
        <SectionLabel title="Contatti Sposo / Contact groom" />
        <div className="grid gap-6 sm:grid-cols-2">
          <TextField id="groomName" label="Nome / Name" required errors={state.fieldErrors?.groomName} />
          <TextField id="groomSurname" label="Cognome / Surname" required errors={state.fieldErrors?.groomSurname} />
          <TextField id="groomPhone" label="Telefono / Telephone number" type="tel" />
          <TextField id="groomEmail" label="Email" type="email" required errors={state.fieldErrors?.groomEmail} />
        </div>
        <p className="mb-2 mt-6 text-xs uppercase tracking-[0.2em] text-ivory-dim/60">
          Contatti social (facoltativo) / Social contacts (optional)
        </p>
        <div className="grid gap-6 sm:grid-cols-2">
          <TextField id="groomFacebook" label="Facebook" />
          <TextField id="groomInstagram" label="Instagram" />
        </div>
      </section>

      <section>
        <SectionLabel title="Location" subtitle="Inserisci la location dove avverrà l'evento" />
        <div className="grid gap-6 sm:grid-cols-2">
          <TextField id="venueName" label="Nome del locale / Location" required errors={state.fieldErrors?.venueName} />
          <TextField
            id="venueAddress"
            label="Indirizzo (Via, Città) / Address"
            required
            errors={state.fieldErrors?.venueAddress}
          />
        </div>
      </section>

      <section>
        <SectionLabel
          title="Cerimonia / Ceremony"
          subtitle="Compila questa sezione se la cerimonia si svolge in loco con l'ausilio del DJ"
        />
        <div className="grid gap-6 sm:grid-cols-2">
          <TextField id="ceremonyStartTime" label="Orario inizio cerimonia / Ceremony start time" type="time" />
          <TextField id="ceremonyEntranceSong" label="Brano ingresso sposa / Song entrance bride" />
          <TextField id="ceremonyRingSong" label="Brano scambio anelli / Ring exchange track" />
          <TextField
            id="ceremonyExitSong"
            label="Brano fine cerimonia (uscita sposi) / End of ceremony song"
          />
        </div>
      </section>

      <section>
        <SectionLabel
          title="La festa / Party"
          subtitle="Indica i brani che vorreste fossero riprodotti nei seguenti momenti / Songs you'd like played at the following times"
        />
        <div className="grid gap-6 sm:grid-cols-2">
          <TextField
            id="partyStartTime"
            label="Ora inizio evento (se la cerimonia non è in loco) / Event start time"
            type="time"
          />
          <TextField
            id="receptionEntranceSong"
            label="Brano ingresso sposi in sala / Entrance track bride and groom"
          />
          <TextField id="cakeCuttingSong" label="Brano taglio della torta / Cake cutting track" />
          <TextField id="slowDanceSong" label="Brano ballo lento / Slow dance song" />
        </div>
      </section>

      <section>
        <SectionLabel
          title="Generi e mood"
          subtitle="Indica quali generi e quale mood vorresti che avesse la festa / What genres and mood would you like for the party"
        />
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
                <input
                  type="checkbox"
                  name="genres"
                  value={genre}
                  className="h-3.5 w-3.5 accent-[color:var(--color-champagne)]"
                />
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
      </section>

      <div className="text-center">
        <p className="mb-6 font-display text-xl text-champagne">
          .......Ora siete pronti a fare FESTAAAA?? 🎉 / Now are you ready to PARTY?? 🎉
        </p>
        <SubmitButton />
      </div>
    </form>
  );
}
