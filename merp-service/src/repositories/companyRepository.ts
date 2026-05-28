import { prisma } from '../index';
import { MstCompany, Prisma } from '@prisma/client';

export class CompanyRepository {
  /**
   * Create a new company
   */
  static async create(data: Prisma.MstCompanyCreateInput): Promise<MstCompany> {
    return prisma.mstCompany.create({
      data,
    });
  }

  /**
   * Get company by ID
   */
  static async findById(id: number): Promise<MstCompany | null> {
    return prisma.mstCompany.findUnique({
      where: { id },
    });
  }

  /**
   * Get company by code
   */
  static async findByCode(code: string): Promise<MstCompany | null> {
    return prisma.mstCompany.findFirst({
      where: { code },
    });
  }

  /**
   * List all companies with pagination and filters
   */
  static async findAll(
    skip: number = 0,
    take: number = 50,
    filters?: { status?: string; search?: string }
  ): Promise<{ data: MstCompany[]; total: number }> {
    const where: Prisma.MstCompanyWhereInput = {};

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
      prisma.mstCompany.findMany({
        where,
        skip,
        take,
        orderBy: { createdAt: 'desc' },
      }),
      prisma.mstCompany.count({ where }),
    ]);

    return { data, total };
  }

  /**
   * Update company
   */
  static async update(
    id: number,
    data: Prisma.MstCompanyUpdateInput
  ): Promise<MstCompany> {
    return prisma.mstCompany.update({
      where: { id },
      data,
    });
  }

  /**
   * Deactivate company (soft delete)
   */
  static async deactivate(id: number): Promise<MstCompany> {
    return prisma.mstCompany.update({
      where: { id },
      data: { status: 'inactive' },
    });
  }

  /**
   * Activate company
   */
  static async activate(id: number): Promise<MstCompany> {
    return prisma.mstCompany.update({
      where: { id },
      data: { status: 'active' },
    });
  }

  /**
   * Delete company (hard delete)
   */
  static async delete(id: number): Promise<void> {
    await prisma.mstCompany.delete({
      where: { id },
    });
  }

  /**
   * Check if company code already exists
   */
  static async codeExists(code: string, excludeId?: number): Promise<boolean> {
    const where: Prisma.MstCompanyWhereInput = { code };
    if (excludeId) {
      where.NOT = { id: excludeId };
    }

    const count = await prisma.mstCompany.count({ where });
    return count > 0;
  }
}
