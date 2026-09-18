import type { Metadata } from "next";
import { buildMetadata } from "@/lib/seo";
import { PageHero } from "@/components/sections/PageHero";
import { Gallery } from "@/components/sections/Gallery";
import { FinalCTA } from "@/components/sections/FinalCTA";

export const metadata: Metadata = buildMetadata({
  title: "Gallery",
  description: "Un assaggio delle atmosfere costruite da Forte DJ evento dopo evento.",
  path: "/gallery",
});

export default function GalleryPage() {
  return (
    <>
      <PageHero
        eyebrow="Gallery"
        title="MOMENTI, NON SOLO FOTO"
        description="Wedding, party ed eventi raccontati per immagini."
      />
      <Gallery full hideHeading />
      <FinalCTA />
    </>
  );
}
