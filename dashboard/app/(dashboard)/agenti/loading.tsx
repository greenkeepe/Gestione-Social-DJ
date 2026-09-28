export default function LoadingAgenti() {
  return (
    <div>
      <div className="skeleton skeleton-line skeleton-line--wide" style={{ height: 28, width: 160 }} />
      <div className="skeleton skeleton-line" style={{ width: 360 }} />
      <div className="grid mt-lg">
        {Array.from({ length: 6 }).map((_, i) => (
          <div key={i} className="skeleton skeleton-card" />
        ))}
      </div>
    </div>
  );
}
