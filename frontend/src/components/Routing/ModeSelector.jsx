export function ModeSelector({ options, selectedModes, onChange }) {
  function toggleMode(mode) {
    if (selectedModes.includes(mode)) {
      const next = selectedModes.filter((item) => item !== mode);
      onChange(next.length === 0 ? selectedModes : next);
      return;
    }

    onChange([...selectedModes, mode]);
  }

  return (
    <div>
      <p className="field-title">Transport Modes</p>
      <div className="mode-grid">
        {options.map((mode) => (
          <label key={mode} className={selectedModes.includes(mode) ? 'mode-chip active' : 'mode-chip'}>
            <input
              type="checkbox"
              checked={selectedModes.includes(mode)}
              onChange={() => toggleMode(mode)}
            />
            <span>{mode}</span>
          </label>
        ))}
      </div>
    </div>
  );
}