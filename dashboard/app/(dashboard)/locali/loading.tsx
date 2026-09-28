export default function LoadingLocali() {
  return (
    <div>
      <div className="skeleton skeleton-line skeleton-line--wide" style={{ height: 28, width: 120 }} />
      <div className="skeleton skeleton-line" style={{ width: 400 }} />
      <div className="skeleton skeleton-card mt-lg" style={{ height: 160 }} />
      <div className="skeleton skeleton-card mt-md" style={{ height: 120 }} />
      <div className="grid mt-md">
        <div className="skeleton skeleton-card" />
        <div className="skeleton skeleton-card" />
        <div className="skeleton skeleton-card" />
      </div>
    </div>
  );
}
