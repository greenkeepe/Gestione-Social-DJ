import { ReactNode } from "react";

interface PageHeaderProps {
  icon?: ReactNode;
  title: string;
  description?: string;
  action?: ReactNode;
}

export function PageHeader({ icon, title, description, action }: PageHeaderProps) {
  return (
    <div className="page-header">
      <div>
        <h1 className="page-header__title">
          {icon}
          {title}
        </h1>
        {description ? <p className="note">{description}</p> : null}
      </div>
      {action ? <div className="page-header__action">{action}</div> : null}
    </div>
  );
}
