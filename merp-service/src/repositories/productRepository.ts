import { prisma } from '../index';
import { MstProduct, Prisma } from '@prisma/client';

interface ProductFilters {
  status?: string;
  search?: string;
  categoryId?: number;
}

/**
 * Product (Item) Repository
 * Single-table scope: mst_product
 * Always scoped to companyId for data isolation
 */
export class ProductRepository {
  /**
   * Create a new product
   */
  static async create(data: Prisma.MstProductUncheckedCreateInput): Promise<MstProduct> {
    return prisma.mstProduct.create({
      data,
      include: {
        category: true,
        unit: true,
      },
    });
  }

  /**
   * Find product by ID
   */
  static async findById(id: number): Promise<MstProduct | null> {
    return prisma.mstProduct.findUnique({
      where: { id },
      include: {
        category: true,
        unit: true,
      },
    });
  }

  /**
   * Find product by company + code (unique)
   */
  static async findByCode(companyId: number, code: string): Promise<MstProduct | null> {
    return prisma.mstProduct.findFirst({
      where: { companyId, code },
    });
  }

  /**
   * List products by company with pagination and filters
   */
  static async findByCompany(
    companyId: number,
    skip: number = 0,
    take: number = 50,
    filters?: ProductFilters
  ): Promise<{ data: MstProduct[]; total: number }> {
    const where: Prisma.MstProductWhereInput = { companyId };

    if (filters?.status) {
      where.status = filters.status;
    }

    if (filters?.categoryId) {
      where.categoryId = filters.categoryId;
    }

    if (filters?.search) {
      where.OR = [
        { name: { contains: filters.search, mode: 'insensitive' } },
        { code: { contains: filters.search, mode: 'insensitive' } },
        { description: { contains: filters.search, mode: 'insensitive' } },
        { hsnCode: { contains: filters.search, mode: 'insensitive' } },
      ];
    }

    const [data, total] = await Promise.all([
      prisma.mstProduct.findMany({
        where,
        skip,
        take,
        orderBy: { createdAt: 'desc' },
        include: {
          category: { select: { id: true, name: true, code: true } },
          unit: { select: { id: true, name: true, code: true, symbol: true } },
        },
      }),
      prisma.mstProduct.count({ where }),
    ]);

    return { data, total };
  }

  /**
   * Update product
   */
  static async update(
    id: number,
    data: Prisma.MstProductUncheckedUpdateInput
  ): Promise<MstProduct> {
    return prisma.mstProduct.update({
      where: { id },
      data,
      include: {
        category: true,
        unit: true,
      },
    });
  }

  /**
   * Soft delete (set status to INACTIVE)
   */
  static async deactivate(id: number): Promise<MstProduct> {
    return prisma.mstProduct.update({
      where: { id },
      data: { status: 'INACTIVE' },
    });
  }

  /**
   * Activate product
   */
  static async activate(id: number): Promise<MstProduct> {
    return prisma.mstProduct.update({
      where: { id },
      data: { status: 'ACTIVE' },
    });
  }

  /**
   * Hard delete
   */
  static async delete(id: number): Promise<void> {
    await prisma.mstProduct.delete({
      where: { id },
    });
  }

  /**
   * Check if product code already exists in company
   */
  static async codeExistsInCompany(
    companyId: number,
    code: string,
    excludeId?: number
  ): Promise<boolean> {
    const where: Prisma.MstProductWhereInput = { companyId, code };
    if (excludeId) {
      where.NOT = { id: excludeId };
    }

    const count = await prisma.mstProduct.count({ where });
    return count > 0;
  }

  /**
   * Search products for autocomplete (lightweight)
   * Returns only id, code, name for dropdown/autocomplete use
   */
  static async searchForAutocomplete(
    companyId: number,
    search: string,
    limit: number = 20
  ): Promise<Pick<MstProduct, 'id' | 'code' | 'name'>[]> {
    return prisma.mstProduct.findMany({
      where: {
        companyId,
        status: 'ACTIVE',
        OR: [
          { name: { contains: search, mode: 'insensitive' } },
          { code: { contains: search, mode: 'insensitive' } },
        ],
      },
      select: { id: true, code: true, name: true },
      take: limit,
      orderBy: { name: 'asc' },
    });
  }

  /**
   * Get products count by category (for dashboard)
   */
  static async countByCategory(companyId: number) {
    return prisma.mstProduct.groupBy({
      by: ['categoryId'],
      where: { companyId, status: 'ACTIVE' },
      _count: { id: true },
    });
  }
}
