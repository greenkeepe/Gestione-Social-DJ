"use client";

import { useCallback, useRef, useState } from "react";
import { Button } from "./Button";

interface ConfirmOptions {
  title: string;
  message: string;
  confirmLabel?: string;
  danger?: boolean;
}

interface PendingConfirm extends ConfirmOptions {
  resolve: (value: boolean) => void;
}

export function useConfirm() {
  const [pending, setPending] = useState<PendingConfirm | null>(null);
  const resolverRef = useRef<((value: boolean) => void) | null>(null);

  const confirm = useCallback((options: ConfirmOptions) => {
    return new Promise<boolean>((resolve) => {
      resolverRef.current = resolve;
      setPending({ ...options, resolve });
    });
  }, []);

  const close = useCallback((value: boolean) => {
    resolverRef.current?.(value);
    resolverRef.current = null;
    setPending(null);
  }, []);

  const dialog = pending ? (
    <div className="confirm-overlay" role="presentation" onClick={() => close(false)}>
      <div
        className="confirm-dialog"
        role="alertdialog"
        aria-modal="true"
        aria-labelledby="confirm-dialog-title"
        onClick={(event) => event.stopPropagation()}
      >
        <h2 id="confirm-dialog-title" className="confirm-dialog__title">
          {pending.title}
        </h2>
        <p className="confirm-dialog__message">{pending.message}</p>
        <div className="confirm-dialog__actions">
          <Button variant="ghost" size="sm" onClick={() => close(false)}>
            Annulla
          </Button>
          <Button variant={pending.danger ? "danger" : "primary"} size="sm" onClick={() => close(true)}>
            {pending.confirmLabel ?? "Conferma"}
          </Button>
        </div>
      </div>
    </div>
  ) : null;

  return { confirm, dialog };
}
