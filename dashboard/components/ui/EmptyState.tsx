import { ReactNode } from "react";

interface EmptyStateProps {
  icon?: ReactNode;
  title: string;
  description?: string;
}

export function EmptyState({ icon, title, description }: EmptyStateProps) {
  return (
    <div className="empty-state">
      {icon}
      <div className="empty-state__title">{title}</div>
      {description ? <p className="note">{description}</p> : null}
    </div>
  );
}
