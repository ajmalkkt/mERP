import { prisma } from '../index';
import { MstUser, Prisma } from '@prisma/client';

export class UserRepository {
  /**
   * Create a new user
   */
  static async create(data: Prisma.MstUserCreateInput): Promise<MstUser> {
    return prisma.mstUser.create({
      data,
    });
  }

  /**
   * Get user by ID
   */
  static async findById(id: number): Promise<MstUser | null> {
    return prisma.mstUser.findUnique({
      where: { id },
    });
  }

  /**
   * Get user by email
   */
  static async findByEmail(email: string): Promise<MstUser | null> {
    return prisma.mstUser.findUnique({
      where: { email },
    });
  }

  /**
   * Get user by username
   */
  static async findByUsername(username: string): Promise<MstUser | null> {
    return prisma.mstUser.findFirst({
      where: { username },
    });
  }

  /**
   * List users by company with pagination
   */
  static async findByCompany(
    companyId: number,
    skip: number = 0,
    take: number = 50,
    filters?: { status?: string; search?: string; departmentId?: number; roleId?: number }
  ): Promise<{ data: MstUser[]; total: number }> {
    const where: Prisma.MstUserWhereInput = { companyId };

    if (filters?.status) {
      where.status = filters.status;
    }

    if (filters?.departmentId) {
      where.departmentId = filters.departmentId;
    }

    if (filters?.search) {
      where.OR = [
        { firstName: { contains: filters.search, mode: 'insensitive' } },
        { lastName: { contains: filters.search, mode: 'insensitive' } },
        { email: { contains: filters.search, mode: 'insensitive' } },
        { username: { contains: filters.search, mode: 'insensitive' } },
      ];
    }

    const [data, total] = await Promise.all([
      prisma.mstUser.findMany({
        where,
        skip,
        take,
        orderBy: { createdAt: 'desc' },
      }),
      prisma.mstUser.count({ where }),
    ]);

    return { data, total };
  }

  /**
   * List all users
   */
  static async findAll(
    skip: number = 0,
    take: number = 50,
    filters?: { status?: string; search?: string; companyId?: number }
  ): Promise<{ data: MstUser[]; total: number }> {
    const where: Prisma.MstUserWhereInput = {};

    if (filters?.companyId) {
      where.companyId = filters.companyId;
    }

    if (filters?.status) {
      where.status = filters.status;
    }

    if (filters?.search) {
      where.OR = [
        { firstName: { contains: filters.search, mode: 'insensitive' } },
        { lastName: { contains: filters.search, mode: 'insensitive' } },
        { email: { contains: filters.search, mode: 'insensitive' } },
      ];
    }

    const [data, total] = await Promise.all([
      prisma.mstUser.findMany({
        where,
        skip,
        take,
        orderBy: { createdAt: 'desc' },
      }),
      prisma.mstUser.count({ where }),
    ]);

    return { data, total };
  }

  /**
   * Update user
   */
  static async update(
    id: number,
    data: Prisma.MstUserUpdateInput
  ): Promise<MstUser> {
    return prisma.mstUser.update({
      where: { id },
      data,
    });
  }

  /**
   * Deactivate user (soft delete)
   */
  static async deactivate(id: number): Promise<MstUser> {
    return prisma.mstUser.update({
      where: { id },
      data: { status: 'inactive' },
    });
  }

  /**
   * Activate user
   */
  static async activate(id: number): Promise<MstUser> {
    return prisma.mstUser.update({
      where: { id },
      data: { status: 'active' },
    });
  }

  /**
   * Delete user
   */
  static async delete(id: number): Promise<void> {
    await prisma.mstUser.delete({
      where: { id },
    });
  }

  /**
   * Check if email exists
   */
  static async emailExists(email: string, excludeId?: number): Promise<boolean> {
    const where: Prisma.MstUserWhereInput = { email };
    if (excludeId) {
      where.NOT = { id: excludeId };
    }

    const count = await prisma.mstUser.count({ where });
    return count > 0;
  }

  /**
   * Check if username exists
   */
  static async usernameExists(username: string, excludeId?: number): Promise<boolean> {
    const where: Prisma.MstUserWhereInput = { username };
    if (excludeId) {
      where.NOT = { id: excludeId };
    }

    const count = await prisma.mstUser.count({ where });
    return count > 0;
  }

  /**
   * Get users by department
   */
  static async findByDepartment(departmentId: number): Promise<MstUser[]> {
    return prisma.mstUser.findMany({
      where: { departmentId },
    });
  }

  /**
   * Get users by role (via SecUserRoleMap)
   */
  static async findByRole(roleId: number): Promise<MstUser[]> {
    return prisma.mstUser.findMany({
      where: {
        userRoles: {
          some: {
            roleId,
          },
        },
      },
    });
  }
}
