export function Card({ title, children }) {
  return (
    <article className="info-card">
      {title ? <h3>{title}</h3> : null}
      {children}
    </article>
  );
}