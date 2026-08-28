import { MODES, getModeState } from '../core/modeMatrix.js';

export function getAllModeStates(condition, now = new Date()) {
	return MODES.map((mode) => ({
		mode,
		...getModeState(mode, condition, now)
	}));
}
