import { prisma } from '../index';
import { MstCategory, Prisma } from '@prisma/client';

interface CategoryFilters {
  status?: string;
  search?: string;
  module?: string;
  parentId?: number | null;
}

/**
 * Category Repository
 * Supports hierarchical tree structure (parent/child) and module scoping (item, account, etc.)
 */
export class CategoryRepository {
  static async create(data: Prisma.MstCategoryUncheckedCreateInput): Promise<MstCategory> {
    return prisma.mstCategory.create({
      data,
      include: {
        parent: { select: { id: true, code: true, name: true } },
      },
    });
  }

  static async findById(id: number): Promise<MstCategory | null> {
    return prisma.mstCategory.findUnique({
      where: { id },
      include: {
        parent: { select: { id: true, code: true, name: true } },
        children: {
          select: { id: true, code: true, name: true, status: true },
          orderBy: { code: 'asc' },
        },
        _count: { select: { products: true } },
      },
    });
  }

  static async findByCompany(
    companyId: number,
    skip: number = 0,
    take: number = 50,
    filters?: CategoryFilters
  ): Promise<{ data: MstCategory[]; total: number }> {
    const where: Prisma.MstCategoryWhereInput = { companyId };

    if (filters?.status) where.status = filters.status;
    if (filters?.module) where.module = filters.module;
    if (filters?.parentId !== undefined) where.parentId = filters.parentId;

    if (filters?.search) {
      where.OR = [
        { name: { contains: filters.search, mode: 'insensitive' } },
        { code: { contains: filters.search, mode: 'insensitive' } },
      ];
    }

    const [data, total] = await Promise.all([
      prisma.mstCategory.findMany({
        where,
        skip,
        take,
        orderBy: { code: 'asc' },
        include: {
          parent: { select: { id: true, code: true, name: true } },
          _count: { select: { products: true, children: true } },
        },
      }),
      prisma.mstCategory.count({ where }),
    ]);

    return { data, total };
  }

  static async update(id: number, data: Prisma.MstCategoryUncheckedUpdateInput): Promise<MstCategory> {
    return prisma.mstCategory.update({
      where: { id },
      data,
      include: {
        parent: { select: { id: true, code: true, name: true } },
      },
    });
  }

  static async deactivate(id: number): Promise<MstCategory> {
    return prisma.mstCategory.update({
      where: { id },
      data: { status: 'INACTIVE' },
    });
  }

  static async delete(id: number): Promise<void> {
    await prisma.mstCategory.delete({ where: { id } });
  }

  static async codeExistsInCompany(
    companyId: number,
    module: string,
    code: string,
    excludeId?: number
  ): Promise<boolean> {
    const where: Prisma.MstCategoryWhereInput = { companyId, module, code };
    if (excludeId) where.NOT = { id: excludeId };
    const count = await prisma.mstCategory.count({ where });
    return count > 0;
  }

  static async hasChildren(id: number): Promise<boolean> {
    const count = await prisma.mstCategory.count({ where: { parentId: id } });
    return count > 0;
  }

  static async hasProducts(id: number): Promise<boolean> {
    const count = await prisma.mstProduct.count({ where: { categoryId: id } });
    return count > 0;
  }

  /**
   * Autocomplete search for dropdowns
   */
  static async searchForAutocomplete(
    companyId: number,
    module: string,
    search: string,
    limit: number = 20
  ): Promise<Pick<MstCategory, 'id' | 'code' | 'name'>[]> {
    return prisma.mstCategory.findMany({
      where: {
        companyId,
        module,
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
}
