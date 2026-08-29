import { MODE_META } from '../utils/modes.js';
import { ModeIcon } from './ModeIcon.jsx';

const MODES = Object.keys(MODE_META);

// Two decorative rails (left drifting down, right drifting up, at different
// slow speeds — see tokens.css) instead of one fast single column, so the
// motion reads as ambient parallax rather than a ticking marquee.
// Shows only on screens wide enough to have genuine empty space either side.
// Non-interactive, aria-hidden.
function Track({ startOffset = 0 }) {
  const ordered = [...MODES.slice(startOffset), ...MODES.slice(0, startOffset)];
  const doubled = [...ordered, ...ordered];

  return (
    <div className="side-rail-track">
      {doubled.map((mode, index) => (
        <span key={`${mode}-${index}`} style={{ color: `var(${MODE_META[mode].colorVar})`, opacity: 0.16 }}>
          <ModeIcon mode={mode} size={30} />
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
