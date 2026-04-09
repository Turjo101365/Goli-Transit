import { v4 as uuidv4 } from 'uuid';

export function requestIdMiddleware(req, res, next) {
	const incomingRequestId = req.headers['x-request-id'];
	const requestId =
		typeof incomingRequestId === 'string' && incomingRequestId.trim().length > 0
			? incomingRequestId
			: uuidv4();

	req.id = requestId;
	res.setHeader('x-request-id', requestId);
	next();
}