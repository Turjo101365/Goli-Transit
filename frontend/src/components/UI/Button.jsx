export function Button({ children, onClick, type = 'button', variant = 'primary', disabled = false }) {
  const className = variant === 'secondary' ? 'secondary-btn' : 'primary-btn';
  return (
    <button type={type} className={className} onClick={onClick} disabled={disabled}>
      {children}
    </button>
  );
}