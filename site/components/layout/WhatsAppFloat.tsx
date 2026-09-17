import { siteConfig } from "@/data/site";

export function WhatsAppFloat() {
  if (!siteConfig.whatsappNumber) return null;

  return (
    <a
      href={siteConfig.whatsappHref}
      target="_blank"
      rel="noopener noreferrer"
      className="group fixed bottom-24 right-4 z-40 flex items-center gap-2 rounded-full bg-[#25D366] py-3 pl-3 pr-3 text-ink shadow-lg shadow-black/30 transition-all duration-300 hover:pr-5 sm:bottom-8 sm:right-8 lg:bottom-8"
      aria-label="Scrivi su WhatsApp"
    >
      <svg viewBox="0 0 24 24" className="h-6 w-6 fill-current" aria-hidden>
        <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.626.712.226 1.36.194 1.872.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347z" />
        <path d="M12.004 2.003c-5.514 0-9.997 4.483-9.997 9.997 0 1.762.462 3.484 1.34 5.003l-1.424 5.2 5.323-1.396a9.96 9.96 0 0 0 4.758 1.19h.004c5.514 0 9.997-4.483 9.997-9.997 0-2.67-1.04-5.18-2.928-7.07a9.93 9.93 0 0 0-7.073-2.927zm0 18.176h-.003a8.19 8.19 0 0 1-4.173-1.14l-.299-.178-3.16.829.843-3.08-.194-.316a8.17 8.17 0 0 1-1.253-4.377c0-4.518 3.677-8.194 8.196-8.194 2.19 0 4.248.853 5.795 2.402a8.14 8.14 0 0 1 2.399 5.797c0 4.518-3.677 8.194-8.15 8.257z" />
      </svg>
      <span className="max-w-0 overflow-hidden whitespace-nowrap text-sm font-medium opacity-0 transition-all duration-300 group-hover:max-w-[10rem] group-hover:opacity-100">
        Scrivi su WhatsApp
      </span>
    </a>
  );
}
