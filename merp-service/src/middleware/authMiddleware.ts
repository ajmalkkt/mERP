import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import { prisma } from '../index';

export interface AuthenticatedRequest extends Request {
  user?: {
    userId: number;
    username: string;
    companyId: number;
    branchId?: number;
    roles: string[];
    permissions: string[];
  };
}

export class AuthMiddleware {
  /**
   * JWT Authentication Middleware
   * Validates JWT token and loads user context
   */
  static authenticate = async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
    try {
      const authHeader = req.headers.authorization;
      if (!authHeader || !authHeader.startsWith('Bearer ')) {
        return res.status(401).json({ error: 'No token provided' });
      }

      const token = authHeader.substring(7);
      const decoded = jwt.verify(token, process.env.JWT_SECRET || 'default-secret') as any;

      // Load user with roles and permissions
      const user = await prisma.mstUser.findUnique({
        where: { id: decoded.userId },
        include: {
          userRoles: {
            include: {
              role: {
                include: {
                  permissions: {
                    include: {
                      permission: true
                    }
                  }
                }
              }
            }
          }
        }
      });

      if (!user || user.status !== 'ACTIVE') {
        return res.status(401).json({ error: 'User not found or inactive' });
      }

      // Extract roles and permissions
      const roles = user.userRoles.map(ur => ur.role.name);
      const permissions = user.userRoles.flatMap(ur =>
        ur.role.permissions.filter(rp => rp.allowed).map(rp => rp.permission.code)
      );

      req.user = {
        userId: user.id,
        username: user.username,
        companyId: decoded.companyId,
        branchId: decoded.branchId,
        roles,
        permissions
      };

      next();
    } catch (error) {
      return res.status(401).json({ error: 'Invalid token' });
    }
  };

  /**
   * Company Isolation Middleware
   * Ensures user can only access their company's data
   */
  static companyIsolation = (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
    if (!req.user) {
      return res.status(401).json({ error: 'Authentication required' });
    }

    // Inject companyId into request for service layer filtering
    (req as any).companyId = req.user.companyId;
    (req as any).branchId = req.user.branchId;

    next();
  };

  /**
   * Permission-based Authorization Middleware
   */
  static authorize = (requiredPermission: string) => {
    return (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
      if (!req.user) {
        return res.status(401).json({ error: 'Authentication required' });
      }

      if (!req.user.permissions.includes(requiredPermission)) {
        return res.status(403).json({ error: 'Insufficient permissions' });
      }

      next();
    };
  };

  /**
   * Role-based Authorization Middleware
   */
  static requireRole = (requiredRole: string) => {
    return (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
      if (!req.user) {
        return res.status(401).json({ error: 'Authentication required' });
      }

      if (!req.user.roles.includes(requiredRole)) {
        return res.status(403).json({ error: 'Insufficient role' });
      }

      next();
    };
  };
}