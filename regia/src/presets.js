// Stili di montaggio. Durate dei tagli espresse in battute (beat) della musica.
export const PRESETS = {
  festa: {
    label: 'Festa / DJ set',
    firstBeats: 8, beatsHigh: 2, beatsLow: 4, minShot: 0.75, fallbackShot: 1.6,
    phrase: 16, // ogni 16 battute: transizione speciale, altrimenti taglio netto sul beat
    hardCuts: true,
    transitions: ['flash', 'zoomin', 'whip', 'flash', 'slide'],
    transDur: 0.24,
    zooms: ['punch', 'push', 'punch', 'pull'], zoomAmt: 0.10, punchAmt: 0.2,
    grade: 'eq=contrast=1.10:saturation=1.30:brightness=0.01,unsharp=5:5:0.5',
    vignette: true,
    weights: { motion: 0.4, sharp: 0.25, bright: 0.15, loud: 0.2 },
  },
  matrimonio: {
    label: 'Matrimonio / elegante',
    firstBeats: 8, beatsHigh: 4, beatsLow: 8, minShot: 1.6, fallbackShot: 3,
    phrase: 8, hardCuts: false,
    transitions: ['dissolve', 'fade', 'smoothleft', 'fade', 'fadewhite'],
    transDur: 0.6,
    zooms: ['push', 'pull'], zoomAmt: 0.07, punchAmt: 0,
    grade: 'eq=contrast=1.04:saturation=1.06:gamma=1.03,colorbalance=rs=0.04:bs=-0.04:rm=0.03:bm=-0.03',
    vignette: true,
    weights: { motion: 0.12, sharp: 0.43, bright: 0.25, loud: 0.2 },
  },
  evento: {
    label: 'Evento / aziendale',
    firstBeats: 8, beatsHigh: 4, beatsLow: 4, minShot: 1.1, fallbackShot: 2.2,
    phrase: 8, hardCuts: true,
    transitions: ['fade', 'zoomin', 'slide', 'circleopen'],
    transDur: 0.35,
    zooms: ['push', 'punch', 'pull'], zoomAmt: 0.08, punchAmt: 0.14,
    grade: 'eq=contrast=1.06:saturation=1.15',
    vignette: false,
    weights: { motion: 0.3, sharp: 0.3, bright: 0.2, loud: 0.2 },
  },
};

// Look (colore): si sceglie nell'editor guardando le anteprime. Ogni stile ha il suo look predefinito.
export const LOOKS = {
  naturale: { label: 'Naturale', grade: 'eq=contrast=1.03:saturation=1.04', vignette: false },
  caldo: { label: 'Caldo elegante', grade: 'eq=contrast=1.05:saturation=1.02:gamma=1.02,colorbalance=rs=0.05:bs=-0.05:rm=0.03:bm=-0.04:rh=0.02:bh=-0.03', vignette: true },
  cinema: { label: 'Cinema', grade: 'eq=contrast=1.10:saturation=0.92,colorbalance=rs=-0.04:bs=0.06:rh=0.06:bh=-0.05', vignette: true },
  notte: { label: 'Notte club', grade: 'eq=contrast=1.12:saturation=1.22:brightness=0.01,unsharp=5:5:0.5', vignette: true },
  bn: { label: 'Bianco e nero', grade: 'hue=s=0,eq=contrast=1.15:brightness=0.02', vignette: true },
};
export const DEFAULT_LOOK = { festa: 'notte', matrimonio: 'caldo', evento: 'naturale' };

export const TRANSITIONS = {
  flash: 'Flash bianco', fade: 'Dissolvenza', dissolve: 'Dissolvenza granulosa', zoomin: 'Zoom', whip: 'Frustata',
  slide: 'Scivola su', smoothleft: 'Scorri', circleopen: 'Cerchio', fadewhite: 'Dissolvenza bianca',
};

// Nomi delle transizioni -> filtro xfade di ffmpeg
export const XFADE = {
  flash: 'fadewhite', zoomin: 'zoomin', whip: 'smoothleft', slide: 'slideup',
  fade: 'fade', dissolve: 'dissolve', smoothleft: 'smoothleft', fadewhite: 'fadewhite', circleopen: 'circleopen',
};

export const FORMATS = {
  '9x16': { W: 1080, H: 1920, label: 'Reels / Storie (9:16)' },
  '4x5': { W: 1080, H: 1350, label: 'Feed Instagram/Facebook (4:5)' },
  '1x1': { W: 1080, H: 1080, label: 'Quadrato (1:1)' },
  '16x9': { W: 1920, H: 1080, label: 'Orizzontale (16:9)' },
};
