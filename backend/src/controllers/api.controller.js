import { ensureDbAvailable } from '../config/db.js';
import { authService } from '../services/auth.service.js';
import { userRepository } from '../repositories/user.repository.js';

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

export async function apiUsersController(req, res, next) {
  try {
    await ensureDbAvailable();
    const users = await userRepository.listUsers();

    return res.status(200).json({
      ok: true,
      data: users,
      requestId: req.id
    });
  } catch (error) {
    return next(error);
  }
}
