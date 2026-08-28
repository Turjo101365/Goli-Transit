import { createContext, useContext, useEffect, useState } from 'react';

const TripContext = createContext(null);
const STORAGE_KEY = 'furut-trip:v1';

function readStored() {
	try {
		const raw = window.localStorage.getItem(STORAGE_KEY);
		return raw ? JSON.parse(raw) : { origin: null, destination: null };
	} catch {
		return { origin: null, destination: null };
	}
}

// One picked origin/destination shared by Map, Live and Belt, so choosing a
// point on one screen carries over to the others instead of forcing the
// same search again — and it survives navigating away and back (or a page
// refresh) via localStorage, not just in-memory React state.
export function TripProvider({ children }) {
	const [trip, setTrip] = useState(readStored);

	useEffect(() => {
		try {
			window.localStorage.setItem(STORAGE_KEY, JSON.stringify(trip));
		} catch {
			// storage unavailable (private mode, quota) — trip still works for this session
		}
	}, [trip]);

	function setOrigin(point) {
		setTrip((current) => ({ ...current, origin: point }));
	}

	function setDestination(point) {
		setTrip((current) => ({ ...current, destination: point }));
	}

	return (
		<TripContext.Provider value={{ origin: trip.origin, destination: trip.destination, setOrigin, setDestination }}>
			{children}
		</TripContext.Provider>
	);
}

export function useTrip() {
	const context = useContext(TripContext);
	if (!context) {
		throw new Error('useTrip must be used within a TripProvider');
	}

	return context;
}
