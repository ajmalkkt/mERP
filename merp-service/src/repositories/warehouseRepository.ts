import { prisma } from '../index';
import { MstWarehouse, Prisma } from '@prisma/client';

/**
 * Warehouse Repository
 * Single-table scope: mst_warehouse
 */
export class WarehouseRepository {
  static async create(data: Prisma.MstWarehouseUncheckedCreateInput): Promise<MstWarehouse> {
    return prisma.mstWarehouse.create({ data });
  }

  static async findById(id: number): Promise<MstWarehouse | null> {
    return prisma.mstWarehouse.findUnique({ where: { id } });
  }

  static async findByCompany(
    companyId: number,
    skip: number = 0,
    take: number = 50,
    filters?: { status?: string; search?: string; branchId?: number; type?: string }
  ): Promise<{ data: MstWarehouse[]; total: number }> {
    const where: Prisma.MstWarehouseWhereInput = { companyId };

    if (filters?.status) where.status = filters.status;
    if (filters?.branchId) where.branchId = filters.branchId;
    if (filters?.type) where.type = filters.type;

    if (filters?.search) {
      where.OR = [
        { name: { contains: filters.search, mode: 'insensitive' } },
        { code: { contains: filters.search, mode: 'insensitive' } },
      ];
    }

    const [data, total] = await Promise.all([
      prisma.mstWarehouse.findMany({
        where,
        skip,
        take,
        orderBy: { code: 'asc' },
      }),
      prisma.mstWarehouse.count({ where }),
    ]);

    return { data, total };
  }

  static async update(id: number, data: Prisma.MstWarehouseUncheckedUpdateInput): Promise<MstWarehouse> {
    return prisma.mstWarehouse.update({ where: { id }, data });
  }

  static async deactivate(id: number): Promise<MstWarehouse> {
    return prisma.mstWarehouse.update({ where: { id }, data: { status: 'INACTIVE' } });
  }

  static async delete(id: number): Promise<void> {
    await prisma.mstWarehouse.delete({ where: { id } });
  }

  static async codeExistsInCompany(
    companyId: number,
    code: string,
    excludeId?: number
  ): Promise<boolean> {
    const where: Prisma.MstWarehouseWhereInput = { companyId, code };
    if (excludeId) where.NOT = { id: excludeId };
    const count = await prisma.mstWarehouse.count({ where });
    return count > 0;
  }

  /**
   * Autocomplete for dropdowns
   */
  static async searchForAutocomplete(
    companyId: number,
    search: string,
    limit: number = 20
  ): Promise<Pick<MstWarehouse, 'id' | 'code' | 'name'>[]> {
    return prisma.mstWarehouse.findMany({
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
}
