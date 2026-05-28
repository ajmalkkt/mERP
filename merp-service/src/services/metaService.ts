import { PrismaClient } from '@prisma/client';
import { ConfigurationService } from './configurationService';

const prisma = new PrismaClient();

export class MetaService {
  /**
   * Retrieves all custom fields configured for a specific entity.
   */
  static async getEntityFields(entityName: string) {
    return await prisma.metaEntity.findUnique({
      where: { entityName },
      include: {
        fields: true,
      },
    });
  }

  /**
   * Translates legacy tags into configured terminology dynamically.
   * e.g., 'warehouse' -> 'Stock'
   * Ideally, this output is cached via Redis on company login.
   */
  static async getTagMappings(companyId?: number) {
    return await ConfigurationService.getAllTagMappings(companyId || null);
  }

  /**
   * Gets the dynamic JSON schema/layout representing a specific voucher type.
   */
  static async getVoucherSchema(voucherType: string) {
    const def = await prisma.metaVoucherDefinition.findUnique({
      where: { voucherType },
      include: {
        fields: {
          include: {
            metaField: true
          }
        }
      }
    });

    return def;
  }
}
