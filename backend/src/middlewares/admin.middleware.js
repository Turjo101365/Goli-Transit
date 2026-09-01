import { createHttpError } from '../utils/http-error.js';

/**
 * Middleware that checks whether the authenticated user has an allowed role (e.g. 'admin', 'moderator').
 * @param  {...string} allowedRoles
 */
export function requireRole(...allowedRoles) {
  return (req, _res, next) => {
    if (!req.user) {
      return next(createHttpError(401, 'AUTH_REQUIRED', 'Authentication required.'));
    }

    const userRole = req.user.role || 'user';

    // Admins always have full access
    if (userRole === 'admin') {
      return next();
    }

    if (allowedRoles.length > 0 && !allowedRoles.includes(userRole)) {
      return next(
        createHttpError(
          403,
          'AUTH_FORBIDDEN',
          `Access restricted to ${allowedRoles.join(' / ')}. You do not have permission.`
        )
      );
    }

    return next();
  };
}

export const requireAdmin = requireRole('admin');
export const requireStaff = requireRole('admin', 'moderator');
