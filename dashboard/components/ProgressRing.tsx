// Gauge SVG leggero (nessuna libreria di charting) per visualizzare una
// singola percentuale — usato per l'utilizzo R2/Anthropic, l'obiettivo
// matrimoni 2027 e la panoramica. Puramente presentazionale: riceve solo
// numeri già calcolati dalla pagina che lo usa.
interface ProgressRingProps {
  /** Percentuale da 0 a 100. Valori fuori range vengono limitati (clamp). */
  percentage: number;
  size?: number;
  strokeWidth?: number;
  color?: string;
  trackColor?: string;
  /** Testo grande al centro (es. "42%"). Se omesso, mostra la percentuale arrotondata. */
  label?: string;
  /** Testo piccolo sotto il valore centrale. */
  sublabel?: string;
}

export function ProgressRing({
  percentage,
  size = 96,
  strokeWidth = 10,
  color = "var(--color-primary)",
  trackColor = "var(--bg-elev-2)",
  label,
  sublabel
}: ProgressRingProps) {
  const clamped = Math.max(0, Math.min(100, Number.isFinite(percentage) ? percentage : 0));
  const radius = (size - strokeWidth) / 2;
  const circumference = 2 * Math.PI * radius;
  const offset = circumference * (1 - clamped / 100);
  const center = size / 2;

  return (
    <div className="progress-ring" style={{ width: size, height: size }}>
      <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} role="img" aria-label={sublabel ? `${sublabel}: ${clamped.toFixed(0)}%` : `${clamped.toFixed(0)}%`}>
        <circle cx={center} cy={center} r={radius} fill="none" stroke={trackColor} strokeWidth={strokeWidth} />
        <circle
          cx={center}
          cy={center}
          r={radius}
          fill="none"
          stroke={color}
          strokeWidth={strokeWidth}
          strokeLinecap="round"
          strokeDasharray={circumference}
          strokeDashoffset={offset}
          transform={`rotate(-90 ${center} ${center})`}
        />
      </svg>
      <div className="progress-ring__text">
        <div className="progress-ring__value">{label ?? `${Math.round(clamped)}%`}</div>
        {sublabel && <div className="progress-ring__sublabel">{sublabel}</div>}
      </div>
    </div>
  );
}
