import { authService } from '../services/auth.service.js';

export async function registerController(req, res, next) {
	try {
		const result = await authService.register(req.body);

		return res.status(201).json({
			ok: true,
			data: result,
			requestId: req.id
		});
	} catch (error) {
		return next(error);
	}
}

export async function loginController(req, res, next) {
	try {
		const result = await authService.login(req.body);

		return res.status(200).json({
			ok: true,
			data: result,
			requestId: req.id
		});
	} catch (error) {
		return next(error);
	}
}

export async function googleLoginController(req, res, next) {
	try {
		const result = await authService.googleLogin(req.body);

		return res.status(200).json({
			ok: true,
			data: result,
			requestId: req.id
		});
	} catch (error) {
		return next(error);
	}
}

export async function guestLoginController(req, res, next) {
	try {
		const result = await authService.guest();

		return res.status(201).json({
			ok: true,
			data: result,
			requestId: req.id
		});
	} catch (error) {
		return next(error);
	}
}

export async function currentUserController(req, res, next) {
	try {
		return res.status(200).json({
			ok: true,
			data: req.user,
			requestId: req.id
		});
	} catch (error) {
		return next(error);
	}
}

export async function forgotPasswordController(req, res, next) {
	try {
		const result = await authService.sendResetCode(req.body);

		return res.status(200).json({
			ok: true,
			data: result,
			requestId: req.id
		});
	} catch (error) {
		return next(error);
	}
}

export async function sendResetCodeController(req, res, next) {
	try {
		const result = await authService.sendResetCode(req.body);

		return res.status(200).json({
			ok: true,
			data: result,
			requestId: req.id
		});
	} catch (error) {
		return next(error);
	}
}

export async function verifyResetCodeController(req, res, next) {
	try {
		const result = await authService.verifyResetCode(req.body);

		return res.status(200).json({
			ok: true,
			data: result,
			requestId: req.id
		});
	} catch (error) {
		return next(error);
	}
}

export async function resetPasswordController(req, res, next) {
	try {
		const result = await authService.resetPassword(req.body);

		return res.status(200).json({
			ok: true,
			data: result,
			requestId: req.id
		});
	} catch (error) {
		return next(error);
	}
}
