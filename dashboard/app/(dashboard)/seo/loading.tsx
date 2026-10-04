export default function LoadingSeo() {
  return (
    <div>
      <div className="skeleton skeleton-line skeleton-line--wide" style={{ height: 28, width: 100 }} />
      <div className="skeleton skeleton-line" style={{ width: 400 }} />
      <div className="skeleton" style={{ height: 36, width: 420, marginTop: 16, borderRadius: 10 }} />
      <div className="grid mt-md">
        <div className="skeleton skeleton-card" />
        <div className="skeleton skeleton-card" />
      </div>
      <div className="skeleton skeleton-card mt-md" style={{ height: 220 }} />
    </div>
  );
}
