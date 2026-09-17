import { Hero } from "@/components/sections/Hero";
import { TrustBar } from "@/components/sections/TrustBar";
import { Intro } from "@/components/sections/Intro";
import { Wedding } from "@/components/sections/Wedding";
import { Numbers } from "@/components/sections/Numbers";
import { Events } from "@/components/sections/Events";
import { Experience } from "@/components/sections/Experience";
import { Gallery } from "@/components/sections/Gallery";
import { Showreel } from "@/components/sections/Showreel";
import { Services } from "@/components/sections/Services";
import { Reviews } from "@/components/sections/Reviews";
import { About } from "@/components/sections/About";
import { MusicGenres } from "@/components/sections/MusicGenres";
import { Process } from "@/components/sections/Process";
import { FAQ } from "@/components/sections/FAQ";
import { FinalCTA } from "@/components/sections/FinalCTA";
import { ContactForm } from "@/components/sections/ContactForm";

export default function Home() {
  return (
    <>
      <Hero />
      <TrustBar />
      <Intro />
      <Wedding />
      <Numbers />
      <Events />
      <Experience />
      <Gallery />
      <Showreel />
      <Services />
      <Reviews />
      <About />
      <MusicGenres />
      <Process />
      <FAQ />
      <FinalCTA />
      <ContactForm />
    </>
  );
}
