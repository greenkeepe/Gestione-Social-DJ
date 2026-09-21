import { createNavigation } from "next-intl/navigation";
import { routing } from "./routing";

// Link/useRouter/usePathname consapevoli della lingua corrente: usarli al
// posto degli equivalenti di next/link e next/navigation in ogni pagina o
// componente sotto app/[locale].
export const { Link, redirect, usePathname, useRouter, getPathname } =
  createNavigation(routing);
