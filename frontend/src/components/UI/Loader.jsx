export function Loader({ label = 'Loading...' }) {
  return (
    <div className="loader-wrap" aria-live="polite">
      <span className="loader-dot" />
      <span>{label}</span>
    </div>
  );
}