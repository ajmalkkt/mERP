import { prisma } from '../index';
import { MstUnit, Prisma } from '@prisma/client';

/**
 * Unit Repository
 * Single-table scope: mst_unit
 */
export class UnitRepository {
  static async create(data: Prisma.MstUnitUncheckedCreateInput): Promise<MstUnit> {
    return prisma.mstUnit.create({ data });
  }

  static async findById(id: number): Promise<MstUnit | null> {
    return prisma.mstUnit.findUnique({
      where: { id },
      include: { _count: { select: { products: true } } },
    });
  }

  static async findByCompany(
    companyId: number,
    skip: number = 0,
    take: number = 50,
    filters?: { status?: string; search?: string }
  ): Promise<{ data: MstUnit[]; total: number }> {
    const where: Prisma.MstUnitWhereInput = { companyId };

    if (filters?.status) where.status = filters.status;
    if (filters?.search) {
      where.OR = [
        { name: { contains: filters.search, mode: 'insensitive' } },
        { code: { contains: filters.search, mode: 'insensitive' } },
        { symbol: { contains: filters.search, mode: 'insensitive' } },
      ];
    }

    const [data, total] = await Promise.all([
      prisma.mstUnit.findMany({
        where,
        skip,
        take,
        orderBy: { code: 'asc' },
        include: { _count: { select: { products: true } } },
      }),
      prisma.mstUnit.count({ where }),
    ]);

    return { data, total };
  }

  static async update(id: number, data: Prisma.MstUnitUncheckedUpdateInput): Promise<MstUnit> {
    return prisma.mstUnit.update({ where: { id }, data });
  }

  static async deactivate(id: number): Promise<MstUnit> {
    return prisma.mstUnit.update({ where: { id }, data: { status: 'INACTIVE' } });
  }

  static async delete(id: number): Promise<void> {
    await prisma.mstUnit.delete({ where: { id } });
  }

  static async codeExistsInCompany(
    companyId: number,
    code: string,
    excludeId?: number
  ): Promise<boolean> {
    const where: Prisma.MstUnitWhereInput = { companyId, code };
    if (excludeId) where.NOT = { id: excludeId };
    const count = await prisma.mstUnit.count({ where });
    return count > 0;
  }

  static async hasProducts(id: number): Promise<boolean> {
    const count = await prisma.mstProduct.count({ where: { unitId: id } });
    return count > 0;
  }

  /**
   * Autocomplete for dropdowns
   */
  static async searchForAutocomplete(
    companyId: number,
    search: string,
    limit: number = 20
  ): Promise<Pick<MstUnit, 'id' | 'code' | 'name' | 'symbol'>[]> {
    return prisma.mstUnit.findMany({
      where: {
        companyId,
        status: 'ACTIVE',
        OR: [
          { name: { contains: search, mode: 'insensitive' } },
          { code: { contains: search, mode: 'insensitive' } },
        ],
      },
      select: { id: true, code: true, name: true, symbol: true },
      take: limit,
      orderBy: { name: 'asc' },
    });
  }
}
