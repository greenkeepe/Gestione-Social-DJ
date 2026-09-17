import { Hero } from "@/components/sections/Hero";
import { Intro } from "@/components/sections/Intro";
import { Wedding } from "@/components/sections/Wedding";
import { Events } from "@/components/sections/Events";
import { Experience } from "@/components/sections/Experience";
import { Gallery } from "@/components/sections/Gallery";
import { Showreel } from "@/components/sections/Showreel";
import { Services } from "@/components/sections/Services";
import { Reviews } from "@/components/sections/Reviews";
import { Process } from "@/components/sections/Process";
import { About } from "@/components/sections/About";
import { FAQ } from "@/components/sections/FAQ";
import { FinalCTA } from "@/components/sections/FinalCTA";
import { ContactForm } from "@/components/sections/ContactForm";

export default function Home() {
  return (
    <>
      <Hero />
      <Intro />
      <Wedding />
      <Events />
      <Experience />
      <Gallery />
      <Showreel />
      <Services />
      <Reviews />
      <Process />
      <About />
      <FAQ />
      <FinalCTA />
      <ContactForm />
    </>
  );
}
