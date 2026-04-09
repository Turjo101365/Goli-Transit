export function validationMiddleware(schema, source = 'body') {
	return (req, _res, next) => {
		const payload = req[source];
		const result = schema.safeParse(payload);

		if (!result.success) {
			const validationError = new Error('Validation failed');
			validationError.statusCode = 400;
			validationError.code = 'VALIDATION_ERROR';
			validationError.details = result.error.flatten();
			return next(validationError);
		}

		req[source] = result.data;
		return next();
	};
}