import { prisma } from '../index';
import { MstBranch, Prisma } from '@prisma/client';

export class BranchRepository {
  /**
   * Create a new branch
   */
  static async create(data: Prisma.MstBranchCreateInput): Promise<MstBranch> {
    return prisma.mstBranch.create({
      data,
    });
  }

  /**
   * Get branch by ID
   */
  static async findById(id: number): Promise<MstBranch | null> {
    return prisma.mstBranch.findUnique({
      where: { id },
    });
  }

  /**
   * Get branch by code
   */
  static async findByCode(code: string): Promise<MstBranch | null> {
    return prisma.mstBranch.findFirst({
      where: { code },
    });
  }

  /**
   * List branches by company with pagination and filters
   */
  static async findByCompany(
    companyId: number,
    skip: number = 0,
    take: number = 50,
    filters?: { status?: string; search?: string }
  ): Promise<{ data: MstBranch[]; total: number }> {
    const where: Prisma.MstBranchWhereInput = { companyId };

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
      prisma.mstBranch.findMany({
        where,
        skip,
        take,
        orderBy: { createdAt: 'desc' },
      }),
      prisma.mstBranch.count({ where }),
    ]);

    return { data, total };
  }

  /**
   * List all branches
   */
  static async findAll(
    skip: number = 0,
    take: number = 50,
    filters?: { status?: string; search?: string; companyId?: number }
  ): Promise<{ data: MstBranch[]; total: number }> {
    const where: Prisma.MstBranchWhereInput = {};

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
      prisma.mstBranch.findMany({
        where,
        skip,
        take,
        orderBy: { createdAt: 'desc' },
      }),
      prisma.mstBranch.count({ where }),
    ]);

    return { data, total };
  }

  /**
   * Update branch
   */
  static async update(
    id: number,
    data: Prisma.MstBranchUpdateInput
  ): Promise<MstBranch> {
    return prisma.mstBranch.update({
      where: { id },
      data,
    });
  }

  /**
   * Deactivate branch
   */
  static async deactivate(id: number): Promise<MstBranch> {
    return prisma.mstBranch.update({
      where: { id },
      data: { status: 'inactive' },
    });
  }

  /**
   * Activate branch
   */
  static async activate(id: number): Promise<MstBranch> {
    return prisma.mstBranch.update({
      where: { id },
      data: { status: 'active' },
    });
  }

  /**
   * Delete branch
   */
  static async delete(id: number): Promise<void> {
    await prisma.mstBranch.delete({
      where: { id },
    });
  }

  /**
   * Check if branch code exists in company
   */
  static async codeExistsInCompany(
    companyId: number,
    code: string,
    excludeId?: number
  ): Promise<boolean> {
    const where: Prisma.MstBranchWhereInput = { companyId, code };
    if (excludeId) {
      where.NOT = { id: excludeId };
    }

    const count = await prisma.mstBranch.count({ where });
    return count > 0;
  }
}
