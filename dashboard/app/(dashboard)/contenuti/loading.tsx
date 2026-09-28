export default function LoadingContenuti() {
  return (
    <div>
      <div className="skeleton skeleton-line skeleton-line--wide" style={{ height: 28, width: 140 }} />
      <div className="grid mt-lg">
        <div className="skeleton skeleton-card" />
        <div className="skeleton skeleton-card" />
        <div className="skeleton skeleton-card" />
      </div>
      <div className="skeleton skeleton-card mt-lg" style={{ height: 180 }} />
    </div>
  );
}
