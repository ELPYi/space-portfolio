import Square from './Square';

export default function Board({ board, onCellClick, disabled }) {
  return (
    <div className="board">
      {board.map((value, index) => (
        <Square
          key={index}
          value={value}
          onClick={() => onCellClick(index)}
          disabled={disabled || value !== null}
        />
      ))}
    </div>
  );
}
