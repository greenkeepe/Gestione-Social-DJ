import { useTranslations } from "next-intl";
import { Link } from "@/i18n/navigation";
import NextLink from "next/link";
import { Mail, Phone } from "lucide-react";
import { InstagramIcon, FacebookIcon, YoutubeIcon } from "@/components/ui/SocialIcons";
import { siteConfig } from "@/data/site";

const socialLinks = [
  { href: siteConfig.instagramUrl, label: "Instagram", Icon: InstagramIcon },
  { href: siteConfig.facebookUrl, label: "Facebook", Icon: FacebookIcon },
  { href: siteConfig.youtubeUrl, label: "YouTube", Icon: YoutubeIcon },
].filter((link) => Boolean(link.href));

export function Footer() {
  const t = useTranslations("Footer");
  const tNav = useTranslations("Nav");
  const navLinks = [
    { href: "/", label: tNav("home") },
    { href: "/matrimoni", label: tNav("matrimoni") },
    { href: "/eventi", label: tNav("eventi") },
    { href: "/servizi", label: tNav("servizi") },
    { href: "/gallery", label: tNav("gallery") },
    { href: "/recensioni", label: tNav("recensioni") },
    { href: "/faq", label: tNav("faq") },
    { href: "/contatti", label: tNav("contatti") },
  ];

  return (
    <footer className="border-t border-line bg-charcoal">
      <div className="container-edit grid gap-12 py-16 md:grid-cols-4">
        <div className="md:col-span-2">
          <span className="font-display text-2xl tracking-[0.15em] text-ivory">
            FORTE DJ
          </span>
          <p className="mt-4 max-w-sm text-sm leading-relaxed text-ivory-dim">
            {t("tagline")}
          </p>
          <div className="mt-6 flex flex-col gap-2 text-sm text-ivory-dim">
            <a
              href={siteConfig.phoneHref}
              className="inline-flex items-center gap-2 hover:text-champagne"
            >
              <Phone className="h-4 w-4" aria-hidden /> {siteConfig.phone}
            </a>
            <a
              href={`mailto:${siteConfig.email}`}
              className="inline-flex items-center gap-2 hover:text-champagne"
            >
              <Mail className="h-4 w-4" aria-hidden /> {siteConfig.email}
            </a>
          </div>
          {socialLinks.length > 0 ? (
            <div className="mt-6 flex gap-4">
              {socialLinks.map(({ href, label, Icon }) => (
                <a
                  key={label}
                  href={href}
                  target="_blank"
                  rel="noopener noreferrer"
                  aria-label={label}
                  className="rounded-full border border-line p-2 text-ivory-dim transition-colors hover:border-champagne hover:text-champagne"
                >
                  <Icon className="h-4 w-4" aria-hidden />
                </a>
              ))}
            </div>
          ) : null}
        </div>

        <nav aria-label={t("sitemapAriaLabel")}>
          <p className="eyebrow mb-4">{t("navigate")}</p>
          <ul className="flex flex-col gap-2 text-sm text-ivory-dim">
            {navLinks.map((link) => (
              <li key={link.href}>
                <Link href={link.href} className="hover:text-champagne">
                  {link.label}
                </Link>
              </li>
            ))}
          </ul>
        </nav>

        <div>
          <p className="eyebrow mb-4">{t("servedArea")}</p>
          <p className="text-sm leading-relaxed text-ivory-dim">
            {t("servedAreaText", {
              location: siteConfig.baseLocation,
              areas: siteConfig.serviceAreas.join(", "),
            })}
          </p>
          <p className="mt-6 eyebrow mb-4">{t("legal")}</p>
          <ul className="flex flex-col gap-2 text-sm text-ivory-dim">
            <li>
              <Link href="/privacy" className="hover:text-champagne">
                {t("privacyPolicy")}
              </Link>
            </li>
            <li>
              <Link href="/cookie" className="hover:text-champagne">
                {t("cookiePolicy")}
              </Link>
            </li>
          </ul>
        </div>
      </div>

      <div className="border-t border-line py-6 pb-24 lg:pb-6">
        <p className="container-edit text-center text-xs text-ivory-dim/70">
          © {new Date().getFullYear()} Forte DJ. {t("rightsReserved")}{" "}
          {/* Link Next.js "semplice" (non quello i18n): /admin non fa parte
              delle rotte multilingua, un prefisso di lingua lo romperebbe. */}
          <NextLink
            href="/admin/seo"
            aria-label={t("seoAreaLabel")}
            className="opacity-30 hover:opacity-100"
          >
            ·
          </NextLink>{" "}
          <a
            href={siteConfig.socialDashboardUrl}
            target="_blank"
            rel="noopener noreferrer"
            aria-label={t("socialDashboardLabel")}
            className="opacity-30 hover:opacity-100"
          >
            ·
          </a>
        </p>
      </div>
    </footer>
  );
}
