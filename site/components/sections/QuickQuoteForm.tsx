"use client";

import { useActionState } from "react";
import { useFormStatus } from "react-dom";
import { CheckCircle2, Loader2, AlertCircle } from "lucide-react";
import { useTranslations } from "next-intl";
import { cn } from "@/lib/utils";
import { submitQuickQuoteForm, type QuickQuoteState } from "@/app/actions/quickQuote";
import { eventTypeOptions } from "@/lib/validation";

const inputClasses =
  "w-full rounded-lg border border-line bg-charcoal px-3 py-2.5 text-sm text-ivory placeholder:text-ivory-dim/50 outline-none transition-colors focus:border-champagne";

function FieldError({ messages }: { messages?: string[] }) {
  if (!messages?.length) return null;
  return (
    <p className="mt-1 flex items-center gap-1 text-xs text-red-400" role="alert">
      <AlertCircle className="h-3 w-3 shrink-0" aria-hidden />
      {messages[0]}
    </p>
  );
}

function SubmitButton() {
  const t = useTranslations("QuickQuoteForm");
  const { pending } = useFormStatus();
  return (
    <button
      type="submit"
      disabled={pending}
      className="inline-flex w-full items-center justify-center gap-2 rounded-full bg-champagne px-6 py-3 text-sm font-medium text-ink transition-all duration-300 hover:bg-champagne-bright disabled:opacity-60"
    >
      {pending ? (
        <>
          <Loader2 className="h-4 w-4 animate-spin" aria-hidden />
          {t("submitting")}
        </>
      ) : (
        t("submit")
      )}
    </button>
  );
}

const initialQuickQuoteState: QuickQuoteState = { status: "idle" };

// Versione minimale del form contatti (niente nome/email): usata dal
// widget "preventivo veloce" sempre visibile. Il form completo in
// /contatti resta invariato per chi preferisce dare più dettagli da
// subito.
export function QuickQuoteForm() {
  const t = useTranslations("QuickQuoteForm");
  const tEventTypes = useTranslations("EventTypeLabels");
  const [state, formAction] = useActionState(
    submitQuickQuoteForm,
    initialQuickQuoteState,
  );

  if (state.status === "success") {
    return (
      <div role="status" className="flex flex-col items-center gap-2 py-2 text-center">
        <CheckCircle2 className="h-6 w-6 text-champagne" aria-hidden />
        <p className="text-sm text-ivory">{t("successMessage")}</p>
      </div>
    );
  }

  return (
    <form action={formAction} className="flex flex-col gap-3">
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
          className="flex items-center gap-1.5 rounded-lg border border-red-400/40 bg-red-400/10 px-3 py-2 text-xs text-red-300"
        >
          <AlertCircle className="h-3.5 w-3.5 shrink-0" aria-hidden />
          {state.message}
        </p>
      ) : null}

      <div>
        <label htmlFor="quick-eventType" className="sr-only">
          {t("eventTypeLabel")}
        </label>
        <select
          id="quick-eventType"
          name="eventType"
          required
          defaultValue=""
          className={cn(inputClasses, "appearance-none")}
        >
          <option value="" disabled>
            {t("eventTypeLabel")}
          </option>
          {eventTypeOptions.map((option) => (
            <option key={option} value={option}>
              {tEventTypes(option)}
            </option>
          ))}
        </select>
        <FieldError messages={state.fieldErrors?.eventType} />
      </div>

      <div>
        <label htmlFor="quick-eventDate" className="sr-only">
          {t("eventDateLabel")}
        </label>
        <input
          id="quick-eventDate"
          name="eventDate"
          type="date"
          required
          className={inputClasses}
        />
        <FieldError messages={state.fieldErrors?.eventDate} />
      </div>

      <div>
        <label htmlFor="quick-location" className="sr-only">
          {t("locationLabel")}
        </label>
        <input
          id="quick-location"
          name="location"
          type="text"
          required
          placeholder={t("locationPlaceholder")}
          className={inputClasses}
        />
        <FieldError messages={state.fieldErrors?.location} />
      </div>

      <div>
        <label htmlFor="quick-phone" className="sr-only">
          {t("phoneLabel")}
        </label>
        <input
          id="quick-phone"
          name="phone"
          type="tel"
          required
          placeholder={t("phonePlaceholder")}
          className={inputClasses}
        />
        <FieldError messages={state.fieldErrors?.phone} />
      </div>

      <SubmitButton />
    </form>
  );
}
