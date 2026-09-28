export default function LoadingPanoramica() {
  return (
    <div>
      <div className="skeleton skeleton-line skeleton-line--wide" style={{ height: 28, width: 220 }} />
      <div className="skeleton skeleton-line" style={{ width: 320 }} />
      <div className="grid mt-lg">
        <div className="skeleton skeleton-card" />
        <div className="skeleton skeleton-card" />
        <div className="skeleton skeleton-card" />
        <div className="skeleton skeleton-card" />
      </div>
      <div className="grid mt-md">
        <div className="skeleton skeleton-card" />
        <div className="skeleton skeleton-card" />
        <div className="skeleton skeleton-card" />
        <div className="skeleton skeleton-card" />
      </div>
    </div>
  );
}
