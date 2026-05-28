import { prisma } from '../index';

export class NumberSequenceService {
  /**
   * Generate next number for a voucher type
   */
  static async generateNumber(
    companyId: number,
    branchId: number | null,
    voucherType: string,
    financialYear: string = new Date().getFullYear().toString()
  ): Promise<string> {
    // Find or create sequence
    let sequence = await prisma.seqNumberSequence.findFirst({
      where: {
        companyId,
        branchId,
        voucherType,
        financialYear,
        isActive: true
      }
    });

    if (!sequence) {
      // Create default sequence
      sequence = await prisma.seqNumberSequence.create({
        data: {
          companyId,
          branchId,
          voucherType,
          prefix: voucherType.substring(0, 3).toUpperCase(),
          pattern: '{PREFIX}-{BRANCH}-{YYYY}-{####}',
          financialYear,
          lastNumber: 0,
          padLength: 4
        }
      });
    }

    // Increment and get next number
    const nextNumber = sequence.lastNumber + 1;

    // Update sequence
    await prisma.seqNumberSequence.update({
      where: { id: sequence.id },
      data: { lastNumber: nextNumber }
    });

    // Generate formatted number
    const branchCode = branchId ? `BR${branchId.toString().padStart(2, '0')}` : 'HQ';
    const year = financialYear.slice(-2);
    const paddedNumber = nextNumber.toString().padStart(sequence.padLength, '0');

    return sequence.pattern
      .replace('{PREFIX}', sequence.prefix)
      .replace('{BRANCH}', branchCode)
      .replace('{YYYY}', financialYear)
      .replace('{YY}', year)
      .replace('{####}', paddedNumber);
  }

  /**
   * Get sequence configuration for admin
   */
  static async getSequenceConfig(companyId: number, voucherType: string) {
    return await prisma.seqNumberSequence.findFirst({
      where: {
        companyId,
        voucherType,
        isActive: true
      }
    });
  }

  /**
   * Update sequence configuration
   */
  static async updateSequenceConfig(
    companyId: number,
    branchId: number | null,
    voucherType: string,
    config: {
      prefix?: string;
      pattern?: string;
      padLength?: number;
    }
  ) {
    const sequence = await prisma.seqNumberSequence.findFirst({
      where: {
        companyId,
        branchId,
        voucherType,
        isActive: true
      }
    });

    if (sequence) {
      return await prisma.seqNumberSequence.update({
        where: { id: sequence.id },
        data: config
      });
    } else {
      return await prisma.seqNumberSequence.create({
        data: {
          companyId,
          branchId,
          voucherType,
          prefix: config.prefix || voucherType.substring(0, 3).toUpperCase(),
          pattern: config.pattern || '{PREFIX}-{BRANCH}-{YYYY}-{####}',
          financialYear: new Date().getFullYear().toString(),
          padLength: config.padLength || 4
        }
      });
    }
  }
}