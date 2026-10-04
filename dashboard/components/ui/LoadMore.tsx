"use client";

import { ReactNode, useState } from "react";
import { Button } from "./Button";

interface LoadMoreProps {
  items: ReactNode[];
  initialCount: number;
  step?: number;
  label?: string;
  /** "table": il pulsante va dentro una <tr><td colSpan> perché l'elenco vive in un <tbody>. */
  as?: "div" | "table";
  colSpan?: number;
}

export function LoadMore({ items, initialCount, step = initialCount, label = "elementi", as = "div", colSpan }: LoadMoreProps) {
  const [visibleCount, setVisibleCount] = useState(initialCount);
  const remaining = items.length - visibleCount;

  if (remaining <= 0) {
    return <>{items.slice(0, visibleCount)}</>;
  }

  const button = (
    <Button variant="ghost" size="sm" onClick={() => setVisibleCount((count) => count + step)}>
      Carica altri {Math.min(remaining, step)} {label}
    </Button>
  );

  if (as === "table") {
    return (
      <>
        {items.slice(0, visibleCount)}
        <tr>
          <td colSpan={colSpan} className="load-more">
            {button}
          </td>
        </tr>
      </>
    );
  }

  return (
    <>
      {items.slice(0, visibleCount)}
      <div className="load-more">{button}</div>
    </>
  );
}
