export const showreel = {
  videoSrc: "/videos/showreel.mp4",
  posterSrc: "/images/showreel-poster.jpg",
};

export type ReelVideo = {
  title: string;
  videoSrc: string;
  posterSrc: string;
};

// Altri video reali forniti dal cliente, mostrati come schede sotto lo
// showreel principale: passa il mouse per un'anteprima, click per aprire
// a schermo intero con audio.
export const reelVideos: ReelVideo[] = [
  {
    title: "Primo ballo tra le stelle filanti",
    videoSrc: "/videos/reel-firstdance.mp4",
    posterSrc: "/images/reel-firstdance-poster.jpg",
  },
  {
    title: "Pista tra fumo e luci",
    videoSrc: "/videos/reel-foggydance.mp4",
    posterSrc: "/images/reel-foggydance-poster.jpg",
  },
  {
    title: "Girotondo con gli invitati",
    videoSrc: "/videos/reel-circledance.mp4",
    posterSrc: "/images/reel-circledance-poster.jpg",
  },
  {
    title: "Festa sotto il tendone",
    videoSrc: "/videos/reel-tentparty.mp4",
    posterSrc: "/images/reel-tentparty-poster.jpg",
  },
];

// Nessuna fotografia/video reale ancora disponibile per queste sezioni.
// Aggiungere il file in public/images/ e valorizzare il campo corrispondente:
// il componente passa automaticamente da placeholder a next/image reale.
export const heroMedia = {
  imageSrc: "/images/hero-ceremony.jpg",
  imageAlt: "Allestimento di una cerimonia di matrimonio con vista sulle colline",
};

export const aboutMedia = {
  imageSrc: "/images/about-andrea.jpg",
  imageAlt: "Andrea, Forte DJ, con le cuffie durante un evento",
};
