export default function Square({ value, onClick, disabled }) {
  return (
    <button
      className={`square ${value ? `square-${value}` : ''}`}
      onClick={onClick}
      disabled={disabled}
    >
      {value}
    </button>
  );
}
