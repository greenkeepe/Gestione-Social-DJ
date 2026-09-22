"use client";

import { useEffect, useState } from "react";
import { useTranslations } from "next-intl";
import { Zap } from "lucide-react";
import { Button } from "@/components/ui/Button";

export function MobileCTA() {
  const t = useTranslations("Nav");
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    const onScroll = () => setVisible(window.scrollY > window.innerHeight * 0.6);
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  return (
    <div
      className={`fixed inset-x-0 bottom-0 z-40 border-t border-line bg-ink/95 px-4 pt-3 backdrop-blur-md transition-transform duration-300 lg:hidden ${
        visible ? "translate-y-0" : "translate-y-full"
      }`}
      style={{ paddingBottom: "calc(env(safe-area-inset-bottom, 0px) + 0.75rem)" }}
    >
      <Button href="/#preventivo" className="w-full">
        <Zap className="h-4 w-4" aria-hidden />
        {t("checkAvailability")}
      </Button>
    </div>
  );
}
