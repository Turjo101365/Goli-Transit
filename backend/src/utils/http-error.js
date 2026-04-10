export function createHttpError(statusCode, code, message, details) {
	const error = new Error(message);
	error.statusCode = statusCode;
	error.code = code;

	if (details) {
		error.details = details;
	}

	return error;
}
