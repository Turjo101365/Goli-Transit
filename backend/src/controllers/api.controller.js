import { authService } from '../services/auth.service.js';

export async function apiRegisterController(req, res, next) {
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
