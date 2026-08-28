import { MODE_META } from '../utils/modes.js';
import { ModeIcon } from './ModeIcon.jsx';

const MODES = Object.keys(MODE_META);

// Decorative, non-interactive: fills the empty margins either side of the
// narrow mobile-first content column on wide screens. Two independent
// loops (left scrolls up, right scrolls down) so they don't move in
// lockstep. Each track renders the mode list twice back-to-back so the
// translateY(-50%) loop point is seamless.
function Track({ startOffset = 0 }) {
  const ordered = [...MODES.slice(startOffset), ...MODES.slice(0, startOffset)];
  const doubled = [...ordered, ...ordered];

  return (
    <div className="side-rail-track">
      {doubled.map((mode, index) => (
        <span key={`${mode}-${index}`} style={{ color: `var(${MODE_META[mode].colorVar})`, opacity: 0.28 }}>
          <ModeIcon mode={mode} size={34} />
        </span>
      ))}
    </div>
  );
}

export function SideRail() {
  return (
    <>
      <div className="side-rail side-rail--left" aria-hidden="true">
        <Track startOffset={0} />
      </div>
      <div className="side-rail side-rail--right" aria-hidden="true">
        <Track startOffset={3} />
      </div>
    </>
  );
}
