"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Pencil } from "lucide-react";
import { Button } from "./ui/Button";
import { NuovoEventoModal } from "./NuovoEventoModal";
import type { Evento } from "../lib/types";

export function ModificaEventoButton({ evento }: { evento: Evento }) {
  const [aperto, setAperto] = useState(false);
  const router = useRouter();

  return (
    <>
      <Button variant="secondary" size="sm" onClick={() => setAperto(true)}>
        <Pencil size={14} aria-hidden="true" /> Modifica evento
      </Button>
      <NuovoEventoModal
        aperto={aperto}
        evento={evento}
        onClose={() => setAperto(false)}
        onCreato={() => {
          setAperto(false);
          router.refresh();
        }}
      />
    </>
  );
}
