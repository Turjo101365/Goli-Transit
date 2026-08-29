import { MODE_META } from '../utils/modes.js';
import { ModeIcon } from './ModeIcon.jsx';

const MODES = Object.keys(MODE_META);

// Single right-side decorative rail.
// Shows only on screens wider than 1280px where there's genuine empty space.
// Non-interactive, aria-hidden.
function Track({ startOffset = 0 }) {
  const ordered = [...MODES.slice(startOffset), ...MODES.slice(0, startOffset)];
  const doubled = [...ordered, ...ordered];

  return (
    <div className="side-rail-track">
      {doubled.map((mode, index) => (
        <span key={`${mode}-${index}`} style={{ color: `var(${MODE_META[mode].colorVar})`, opacity: 0.22 }}>
          <ModeIcon mode={mode} size={28} />
        </span>
      ))}
    </div>
  );
}

export function SideRail() {
  return (
    <div className="side-rail side-rail--right" aria-hidden="true">
      <Track startOffset={2} />
    </div>
  );
}
