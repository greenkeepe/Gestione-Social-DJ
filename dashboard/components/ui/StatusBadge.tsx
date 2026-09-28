import { BadgeTone } from "../../lib/statusVocabulary";

interface StatusBadgeProps {
  label: string;
  tone: BadgeTone;
}

export function StatusBadge({ label, tone }: StatusBadgeProps) {
  return <span className={`badge badge--${tone}`}>{label}</span>;
}
