import { prisma } from '../index';
import { SecRole, Prisma } from '@prisma/client';

export class RoleRepository {
  /**
   * Create a new role
   */
  static async create(data: Prisma.SecRoleCreateInput): Promise<SecRole> {
    return prisma.secRole.create({
      data,
    });
  }

  /**
   * Get role by ID
   */
  static async findById(id: number): Promise<SecRole | null> {
    return prisma.secRole.findUnique({
      where: { id },
    });
  }

  /**
   * Get role by code
   */
  static async findByCode(code: string): Promise<SecRole | null> {
    return prisma.secRole.findFirst({
      where: { code },
    });
  }

  /**
   * List all roles
   */
  static async findAll(
    skip: number = 0,
    take: number = 50,
    filters?: { status?: string; search?: string; companyId?: number }
  ): Promise<{ data: SecRole[]; total: number }> {
    const where: Prisma.SecRoleWhereInput = {};

    if (filters?.companyId) {
      where.companyId = filters.companyId;
    }

    if (filters?.status) {
      where.status = filters.status;
    }

    if (filters?.search) {
      where.OR = [
        { name: { contains: filters.search, mode: 'insensitive' } },
        { code: { contains: filters.search, mode: 'insensitive' } },
      ];
    }

    const [data, total] = await Promise.all([
      prisma.secRole.findMany({
        where,
        skip,
        take,
        orderBy: { createdAt: 'desc' },
      }),
      prisma.secRole.count({ where }),
    ]);

    return { data, total };
  }

  /**
   * List roles by company
   */
  static async findByCompany(
    companyId: number,
    skip: number = 0,
    take: number = 50,
    filters?: { status?: string; search?: string }
  ): Promise<{ data: SecRole[]; total: number }> {
    const where: Prisma.SecRoleWhereInput = { companyId };

    if (filters?.status) {
      where.status = filters.status;
    }

    if (filters?.search) {
      where.OR = [
        { name: { contains: filters.search, mode: 'insensitive' } },
        { code: { contains: filters.search, mode: 'insensitive' } },
      ];
    }

    const [data, total] = await Promise.all([
      prisma.secRole.findMany({
        where,
        skip,
        take,
        orderBy: { createdAt: 'desc' },
      }),
      prisma.secRole.count({ where }),
    ]);

    return { data, total };
  }

  /**
   * Update role
   */
  static async update(
    id: number,
    data: Prisma.SecRoleUpdateInput
  ): Promise<SecRole> {
    return prisma.secRole.update({
      where: { id },
      data,
    });
  }

  /**
   * Deactivate role
   */
  static async deactivate(id: number): Promise<SecRole> {
    return prisma.secRole.update({
      where: { id },
      data: { status: 'inactive' },
    });
  }

  /**
   * Activate role
   */
  static async activate(id: number): Promise<SecRole> {
    return prisma.secRole.update({
      where: { id },
      data: { status: 'active' },
    });
  }

  /**
   * Delete role
   */
  static async delete(id: number): Promise<void> {
    await prisma.secRole.delete({
      where: { id },
    });
  }

  /**
   * Check if role code exists
   */
  static async codeExists(code: string, excludeId?: number): Promise<boolean> {
    const where: Prisma.SecRoleWhereInput = { code };
    if (excludeId) {
      where.NOT = { id: excludeId };
    }

    const count = await prisma.secRole.count({ where });
    return count > 0;
  }

  /**
   * Get role by code in company
   */
  static async findByCodeInCompany(
    companyId: number,
    code: string
  ): Promise<SecRole | null> {
    return prisma.secRole.findFirst({
      where: { code, companyId },
    });
  }

  /**
   * Get users with this role
   */
  static async findUsersInRole(roleId: number): Promise<number> {
    return prisma.secUserRole.count({
      where: { roleId },
    });
  }
}
