"use client";

import { useActionState, useState } from "react";
import { useFormStatus } from "react-dom";
import { CheckCircle2, Loader2, AlertCircle, Plus } from "lucide-react";
import { SectionHeading } from "@/components/ui/SectionHeading";
import { cn } from "@/lib/utils";
import {
  submitContactForm,
  type ContactFormState,
} from "@/app/actions/contact";
import {
  eventTypeOptions,
  desiredServiceOptions,
  referralOptions,
} from "@/lib/validation";

const inputClasses =
  "w-full rounded-lg border border-line bg-charcoal-soft px-4 py-3 text-ivory placeholder:text-ivory-dim/50 outline-none transition-colors focus:border-champagne";

function FieldError({ messages }: { messages?: string[] }) {
  if (!messages?.length) return null;
  return (
    <p className="mt-1.5 flex items-center gap-1.5 text-xs text-red-400" role="alert">
      <AlertCircle className="h-3.5 w-3.5" aria-hidden />
      {messages[0]}
    </p>
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
          Invio in corso…
        </>
      ) : (
        "Verifica la disponibilità"
      )}
    </button>
  );
}

const initialContactFormState: ContactFormState = { status: "idle" };

export function ContactForm() {
  const [state, formAction] = useActionState(
    submitContactForm,
    initialContactFormState,
  );
  const [showMore, setShowMore] = useState(false);

  return (
    <section id="contatti-form" className="bg-ink py-28 md:py-40">
      <div className="container-edit max-w-3xl">
        <SectionHeading
          eyebrow="Contatti"
          title="RACCONTA IL TUO EVENTO"
          description="Bastano 4 informazioni: il resto lo definiamo insieme."
        />

        {state.status === "success" ? (
          <div
            role="status"
            className="mt-12 flex flex-col items-center gap-4 rounded-2xl border border-champagne/40 bg-champagne/5 p-10 text-center"
          >
            <CheckCircle2 className="h-8 w-8 text-champagne" aria-hidden />
            <h3 className="font-display text-2xl text-ivory">
              Richiesta ricevuta
            </h3>
            <p className="max-w-md text-sm text-ivory-dim">
              Grazie! Ti risponderemo al più presto per confermare la
              disponibilità. Per una risposta più rapida puoi anche scriverci
              su WhatsApp.
            </p>
          </div>
        ) : (
          <form action={formAction} className="mt-12">
            {/* Honeypot anti-spam: display:none (non solo fuori schermo), è
                l'unico modo per cui autofill e gestori di password lo
                ignorano davvero invece di riempirlo comunque. */}
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
                className="mb-6 flex items-center gap-2 rounded-lg border border-red-400/40 bg-red-400/10 px-4 py-3 text-sm text-red-300"
              >
                <AlertCircle className="h-4 w-4 shrink-0" aria-hidden />
                {state.message}
              </p>
            ) : null}

            <div className="grid gap-6 sm:grid-cols-2">
              <div>
                <label htmlFor="name" className="mb-2 block text-sm text-ivory-dim">
                  Nome *
                </label>
                <input id="name" name="name" required className={inputClasses} />
                <FieldError messages={state.fieldErrors?.name} />
              </div>

              <div>
                <label htmlFor="email" className="mb-2 block text-sm text-ivory-dim">
                  Email *
                </label>
                <input
                  id="email"
                  name="email"
                  type="email"
                  required
                  className={inputClasses}
                />
                <FieldError messages={state.fieldErrors?.email} />
              </div>

              <div>
                <label htmlFor="phone" className="mb-2 block text-sm text-ivory-dim">
                  Telefono *
                </label>
                <input
                  id="phone"
                  name="phone"
                  type="tel"
                  required
                  className={inputClasses}
                />
                <FieldError messages={state.fieldErrors?.phone} />
              </div>

              <div>
                <label
                  htmlFor="eventType"
                  className="mb-2 block text-sm text-ivory-dim"
                >
                  Tipo di evento *
                </label>
                <select
                  id="eventType"
                  name="eventType"
                  required
                  defaultValue=""
                  className={cn(inputClasses, "appearance-none")}
                >
                  <option value="" disabled>
                    Seleziona
                  </option>
                  {eventTypeOptions.map((option) => (
                    <option key={option} value={option}>
                      {option}
                    </option>
                  ))}
                </select>
                <FieldError messages={state.fieldErrors?.eventType} />
              </div>
            </div>

            <button
              type="button"
              onClick={() => setShowMore((v) => !v)}
              aria-expanded={showMore}
              aria-controls="contact-extra-fields"
              className="mt-6 inline-flex items-center gap-2 text-sm text-champagne hover:text-champagne-bright"
            >
              <Plus
                className={cn(
                  "h-4 w-4 transition-transform duration-300",
                  showMore && "rotate-45",
                )}
                aria-hidden
              />
              {showMore
                ? "Nascondi dettagli aggiuntivi"
                : "Aggiungi dettagli sul tuo evento (facoltativo)"}
            </button>

            <div
              id="contact-extra-fields"
              className={cn(
                "grid overflow-hidden transition-all duration-300 ease-out",
                showMore ? "grid-rows-[1fr] opacity-100" : "grid-rows-[0fr] opacity-0",
              )}
            >
              <div className="min-h-0">
                <div className="grid gap-6 pt-6 sm:grid-cols-2">
                  <div>
                    <label
                      htmlFor="eventDate"
                      className="mb-2 block text-sm text-ivory-dim"
                    >
                      Data evento
                    </label>
                    <input
                      id="eventDate"
                      name="eventDate"
                      type="date"
                      className={inputClasses}
                    />
                    <FieldError messages={state.fieldErrors?.eventDate} />
                  </div>

                  <div>
                    <label htmlFor="location" className="mb-2 block text-sm text-ivory-dim">
                      Location
                    </label>
                    <input id="location" name="location" className={inputClasses} />
                  </div>

                  <div>
                    <label
                      htmlFor="guestCount"
                      className="mb-2 block text-sm text-ivory-dim"
                    >
                      Numero indicativo invitati
                    </label>
                    <input id="guestCount" name="guestCount" className={inputClasses} />
                  </div>

                  <div>
                    <label htmlFor="referral" className="mb-2 block text-sm text-ivory-dim">
                      Come hai conosciuto Forte DJ?
                    </label>
                    <select
                      id="referral"
                      name="referral"
                      defaultValue=""
                      className={cn(inputClasses, "appearance-none")}
                    >
                      <option value="" disabled>
                        Seleziona
                      </option>
                      {referralOptions.map((option) => (
                        <option key={option} value={option}>
                          {option}
                        </option>
                      ))}
                    </select>
                  </div>

                  <fieldset className="sm:col-span-2">
                    <legend className="mb-2 block text-sm text-ivory-dim">
                      Servizi desiderati
                    </legend>
                    <div className="flex flex-wrap gap-3">
                      {desiredServiceOptions.map((option) => (
                        <label
                          key={option}
                          className="flex cursor-pointer items-center gap-2 rounded-full border border-line px-4 py-2 text-sm text-ivory-dim transition-colors has-[:checked]:border-champagne has-[:checked]:text-champagne"
                        >
                          <input
                            type="checkbox"
                            name="desiredServices"
                            value={option}
                            className="h-3.5 w-3.5 accent-[color:var(--color-champagne)]"
                          />
                          {option}
                        </label>
                      ))}
                    </div>
                  </fieldset>

                  <div className="sm:col-span-2">
                    <label htmlFor="message" className="mb-2 block text-sm text-ivory-dim">
                      Messaggio
                    </label>
                    <textarea
                      id="message"
                      name="message"
                      rows={4}
                      className={cn(inputClasses, "resize-none")}
                    />
                  </div>
                </div>
              </div>
            </div>

            <p className="mt-8 text-sm text-ivory-dim">
              Nessun impegno. Raccontami semplicemente cosa stai organizzando.
            </p>
            <div className="mt-4">
              <SubmitButton />
            </div>
          </form>
        )}
      </div>
    </section>
  );
}
