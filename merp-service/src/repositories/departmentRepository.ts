import { prisma } from '../index';
import { MstDepartment, Prisma } from '@prisma/client';

export class DepartmentRepository {
  /**
   * Create a new department
   */
  static async create(data: Prisma.MstDepartmentCreateInput): Promise<MstDepartment> {
    return prisma.mstDepartment.create({
      data,
    });
  }

  /**
   * Get department by ID
   */
  static async findById(id: number): Promise<MstDepartment | null> {
    return prisma.mstDepartment.findUnique({
      where: { id },
    });
  }

  /**
   * Get department by code
   */
  static async findByCode(code: string): Promise<MstDepartment | null> {
    return prisma.mstDepartment.findFirst({
      where: { code },
    });
  }

  /**
   * List departments by branch
   */
  static async findByBranch(
    branchId: number,
    skip: number = 0,
    take: number = 50,
    filters?: { status?: string; search?: string }
  ): Promise<{ data: MstDepartment[]; total: number }> {
    const where: Prisma.MstDepartmentWhereInput = { branchId };

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
      prisma.mstDepartment.findMany({
        where,
        skip,
        take,
        orderBy: { createdAt: 'desc' },
      }),
      prisma.mstDepartment.count({ where }),
    ]);

    return { data, total };
  }

  /**
   * List all departments
   */
  static async findAll(
    skip: number = 0,
    take: number = 50,
    filters?: { status?: string; search?: string; branchId?: number; companyId?: number }
  ): Promise<{ data: MstDepartment[]; total: number }> {
    const where: Prisma.MstDepartmentWhereInput = {};

    if (filters?.companyId) {
      where.companyId = filters.companyId;
    }

    if (filters?.branchId) {
      where.branchId = filters.branchId;
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
      prisma.mstDepartment.findMany({
        where,
        skip,
        take,
        orderBy: { createdAt: 'desc' },
      }),
      prisma.mstDepartment.count({ where }),
    ]);

    return { data, total };
  }

  /**
   * Update department
   */
  static async update(
    id: number,
    data: Prisma.MstDepartmentUpdateInput
  ): Promise<MstDepartment> {
    return prisma.mstDepartment.update({
      where: { id },
      data,
    });
  }

  /**
   * Deactivate department
   */
  static async deactivate(id: number): Promise<MstDepartment> {
    return prisma.mstDepartment.update({
      where: { id },
      data: { status: 'inactive' },
    });
  }

  /**
   * Activate department
   */
  static async activate(id: number): Promise<MstDepartment> {
    return prisma.mstDepartment.update({
      where: { id },
      data: { status: 'active' },
    });
  }

  /**
   * Delete department
   */
  static async delete(id: number): Promise<void> {
    await prisma.mstDepartment.delete({
      where: { id },
    });
  }

  /**
   * Check if department code exists in branch
   */
  static async codeExistsInBranch(
    branchId: number,
    code: string,
    excludeId?: number
  ): Promise<boolean> {
    const where: Prisma.MstDepartmentWhereInput = { branchId, code };
    if (excludeId) {
      where.NOT = { id: excludeId };
    }

    const count = await prisma.mstDepartment.count({ where });
    return count > 0;
  }
}
