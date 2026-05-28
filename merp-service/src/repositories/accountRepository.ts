import { prisma } from '../index';
import { MstAccount, Prisma } from '@prisma/client';

interface AccountFilters {
  status?: string;
  search?: string;
  accountType?: string;
  isGroup?: boolean;
  parentId?: number | null;
  subledgerType?: string;
}

/**
 * Account (Chart of Accounts) Repository
 * Single-table scope: mst_account
 * Supports hierarchical tree structure via parentId
 */
export class AccountRepository {
  /**
   * Create a new account
   */
  static async create(data: Prisma.MstAccountUncheckedCreateInput): Promise<MstAccount> {
    return prisma.mstAccount.create({
      data,
      include: {
        parent: { select: { id: true, code: true, name: true } },
      },
    });
  }

  /**
   * Find account by ID
   */
  static async findById(id: number): Promise<MstAccount | null> {
    return prisma.mstAccount.findUnique({
      where: { id },
      include: {
        parent: { select: { id: true, code: true, name: true } },
        children: {
          select: { id: true, code: true, name: true, accountType: true, isGroup: true, status: true },
          orderBy: { code: 'asc' },
        },
      },
    });
  }

  /**
   * Find account by company + code (unique)
   */
  static async findByCode(companyId: number, code: string): Promise<MstAccount | null> {
    return prisma.mstAccount.findFirst({
      where: { companyId, code },
    });
  }

  /**
   * List accounts by company with pagination and filters
   */
  static async findByCompany(
    companyId: number,
    skip: number = 0,
    take: number = 50,
    filters?: AccountFilters
  ): Promise<{ data: MstAccount[]; total: number }> {
    const where: Prisma.MstAccountWhereInput = { companyId };

    if (filters?.status) {
      where.status = filters.status;
    }

    if (filters?.accountType) {
      where.accountType = filters.accountType;
    }

    if (filters?.isGroup !== undefined) {
      where.isGroup = filters.isGroup;
    }

    if (filters?.subledgerType) {
      where.subledgerType = filters.subledgerType;
    }

    // parentId filter: null means root-level accounts
    if (filters?.parentId !== undefined) {
      where.parentId = filters.parentId;
    }

    if (filters?.search) {
      where.OR = [
        { name: { contains: filters.search, mode: 'insensitive' } },
        { code: { contains: filters.search, mode: 'insensitive' } },
        { alias: { contains: filters.search, mode: 'insensitive' } },
      ];
    }

    const [data, total] = await Promise.all([
      prisma.mstAccount.findMany({
        where,
        skip,
        take,
        orderBy: { code: 'asc' },
        include: {
          parent: { select: { id: true, code: true, name: true } },
          _count: { select: { children: true } },
        },
      }),
      prisma.mstAccount.count({ where }),
    ]);

    return { data, total };
  }

  /**
   * Get full account tree (hierarchy) for a company
   * Returns root-level accounts with nested children
   */
  static async getAccountTree(companyId: number): Promise<MstAccount[]> {
    return prisma.mstAccount.findMany({
      where: { companyId, parentId: null, status: 'ACTIVE' },
      include: {
        children: {
          where: { status: 'ACTIVE' },
          include: {
            children: {
              where: { status: 'ACTIVE' },
              include: {
                children: {
                  where: { status: 'ACTIVE' },
                  orderBy: { code: 'asc' },
                },
              },
              orderBy: { code: 'asc' },
            },
          },
          orderBy: { code: 'asc' },
        },
      },
      orderBy: { code: 'asc' },
    });
  }

  /**
   * Update account
   */
  static async update(
    id: number,
    data: Prisma.MstAccountUncheckedUpdateInput
  ): Promise<MstAccount> {
    return prisma.mstAccount.update({
      where: { id },
      data,
      include: {
        parent: { select: { id: true, code: true, name: true } },
      },
    });
  }

  /**
   * Soft delete
   */
  static async deactivate(id: number): Promise<MstAccount> {
    return prisma.mstAccount.update({
      where: { id },
      data: { status: 'INACTIVE' },
    });
  }

  /**
   * Activate
   */
  static async activate(id: number): Promise<MstAccount> {
    return prisma.mstAccount.update({
      where: { id },
      data: { status: 'ACTIVE' },
    });
  }

  /**
   * Hard delete
   */
  static async delete(id: number): Promise<void> {
    await prisma.mstAccount.delete({
      where: { id },
    });
  }

  /**
   * Check if code already exists in company
   */
  static async codeExistsInCompany(
    companyId: number,
    code: string,
    excludeId?: number
  ): Promise<boolean> {
    const where: Prisma.MstAccountWhereInput = { companyId, code };
    if (excludeId) {
      where.NOT = { id: excludeId };
    }

    const count = await prisma.mstAccount.count({ where });
    return count > 0;
  }

  /**
   * Check if account has children (prevent deletion of group accounts with children)
   */
  static async hasChildren(id: number): Promise<boolean> {
    const count = await prisma.mstAccount.count({
      where: { parentId: id },
    });
    return count > 0;
  }

  /**
   * Search accounts for autocomplete (lightweight)
   * Useful for voucher entry forms when selecting debit/credit accounts
   */
  static async searchForAutocomplete(
    companyId: number,
    search: string,
    limit: number = 20,
    excludeGroups: boolean = true
  ): Promise<Pick<MstAccount, 'id' | 'code' | 'name' | 'accountType'>[]> {
    const where: Prisma.MstAccountWhereInput = {
      companyId,
      status: 'ACTIVE',
      OR: [
        { name: { contains: search, mode: 'insensitive' } },
        { code: { contains: search, mode: 'insensitive' } },
      ],
    };

    if (excludeGroups) {
      where.isGroup = false;
    }

    return prisma.mstAccount.findMany({
      where,
      select: { id: true, code: true, name: true, accountType: true },
      take: limit,
      orderBy: { code: 'asc' },
    });
  }

  /**
   * Get accounts by type for reporting
   */
  static async findByType(
    companyId: number,
    accountType: string
  ): Promise<MstAccount[]> {
    return prisma.mstAccount.findMany({
      where: { companyId, accountType, status: 'ACTIVE', isGroup: false },
      orderBy: { code: 'asc' },
    });
  }

  /**
   * Get balance summary per account type (for trial balance / dashboard)
   */
  static async getOpeningBalanceSummary(companyId: number) {
    return prisma.mstAccount.groupBy({
      by: ['accountType'],
      where: { companyId, status: 'ACTIVE', isGroup: false },
      _sum: { openingBalance: true },
      _count: { id: true },
    });
  }
}
