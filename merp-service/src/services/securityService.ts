import { prisma } from '../index';
import bcrypt from 'bcrypt';
import jwt from 'jsonwebtoken';

export class SecurityService {
  /**
   * Authenticate user and return JWT token
   */
  static async authenticateUser(username: string, password: string) {
    const user = await prisma.mstUser.findUnique({
      where: { username },
      include: {
        userRoles: {
          include: {
            role: true
          }
        },
        dataScopes: true
      }
    });

    if (!user || (user.status !== 'ACTIVE' && user.status !== 'active')) {
      throw new Error('Invalid credentials');
    }

    const isValidPassword = await bcrypt.compare(password, user.passwordHash || '');
    if (!isValidPassword) {
      throw new Error('Invalid credentials');
    }

    // Get primary data scope
    const primaryScope = user.dataScopes[0];
    if (!primaryScope) {
      throw new Error('No data scope assigned');
    }

    const token = jwt.sign(
      {
        userId: user.id,
        username: user.username,
        companyId: primaryScope.companyId,
        branchId: primaryScope.branchId
      },
      process.env.JWT_SECRET || 'default-secret',
      { expiresIn: '8h' }
    );

    return {
      token,
      user: {
        id: user.id,
        username: user.username,
        name: `${user.firstName} ${user.lastName}`,
        companyId: primaryScope.companyId,
        branchId: primaryScope.branchId,
        roles: user.userRoles.map(ur => ur.role.name)
      }
    };
  }

  /**
   * Check if user has permission for entity operation
   */
  static async checkEntityPermission(userId: number, entity: string, operation: 'create' | 'read' | 'update' | 'delete') {
    const user = await prisma.mstUser.findUnique({
      where: { id: userId },
      include: {
        userRoles: {
          include: {
            role: {
              include: {
                entityPermissions: true
              }
            }
          }
        }
      }
    });

    if (!user) return false;

    // Check if any role has the required permission
    for (const userRole of user.userRoles) {
      const entityPerm = userRole.role.entityPermissions.find(ep => ep.entity === entity);
      if (entityPerm) {
        switch (operation) {
          case 'create': return entityPerm.canCreate;
          case 'read': return entityPerm.canRead;
          case 'update': return entityPerm.canUpdate;
          case 'delete': return entityPerm.canDelete;
        }
      }
    }

    return false;
  }

  /**
   * Check field-level permissions
   */
  static async getFieldPermissions(userId: number, entity: string) {
    const user = await prisma.mstUser.findUnique({
      where: { id: userId },
      include: {
        userRoles: {
          include: {
            role: {
              include: {
                fieldPermissions: true
              }
            }
          }
        }
      }
    });

    if (!user) return {};

    const fieldPerms: Record<string, { canEdit: boolean; canView: boolean }> = {};

    // Aggregate permissions from all roles
    for (const userRole of user.userRoles) {
      for (const fieldPerm of userRole.role.fieldPermissions.filter(fp => fp.entity === entity)) {
        fieldPerms[fieldPerm.fieldName] = {
          canEdit: fieldPerm.canEdit,
          canView: fieldPerm.canView
        };
      }
    }

    return fieldPerms;
  }

  /**
   * Get user's allowed data scope (companies, branches, departments)
   */
  static async getUserDataScope(userId: number) {
    const scopes = await prisma.secUserDataScope.findMany({
      where: { userId }
    });

    return {
      companies: [...new Set(scopes.map(s => s.companyId))],
      branches: [...new Set(scopes.map(s => s.branchId).filter(Boolean))],
      departments: [...new Set(scopes.map(s => s.deptId).filter(Boolean))]
    };
  }

  /**
   * Log audit event
   */
  static async logAudit(
    userId: number,
    entity: string,
    entityId: number,
    action: string,
    oldValue?: any,
    newValue?: any,
    ipAddress?: string
  ) {
    await prisma.secAuditLog.create({
      data: {
        userId,
        entity,
        entityId,
        action,
        oldValue,
        newValue,
        ipAddress
      }
    });
  }

  /**
   * Hash password
   */
  static async hashPassword(password: string): Promise<string> {
    return bcrypt.hash(password, 12);
  }
}