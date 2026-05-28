import { prisma } from '../index';

export class ConfigurationService {
  /**
   * Get configuration value
   */
  static async getConfig(companyId: number | null, module: string, configKey: string) {
    const config = await prisma.cfgConfig.findFirst({
      where: {
        OR: [
          { companyId, module, configKey },
          { companyId: null, module, configKey } // Global fallback
        ]
      },
      orderBy: { companyId: 'desc' } // Company-specific first
    });

    return config?.configValue || null;
  }

  /**
   * Set configuration value
   */
  static async setConfig(
    companyId: number | null,
    module: string,
    configKey: string,
    configValue: any,
    dataType: string = 'string'
  ) {
    // Try to find existing config
    const existing = await prisma.cfgConfig.findFirst({
      where: {
        companyId,
        module,
        configKey
      }
    });

    if (existing) {
      return await prisma.cfgConfig.update({
        where: { id: existing.id },
        data: { configValue, dataType }
      });
    } else {
      return await prisma.cfgConfig.create({
        data: {
          companyId,
          module,
          configKey,
          configValue,
          dataType
        }
      });
    }
  }

  /**
   * Get all configurations for a company/module
   */
  static async getModuleConfigs(companyId: number | null, module: string) {
    const configs = await prisma.cfgConfig.findMany({
      where: {
        OR: [
          { companyId, module },
          { companyId: null, module }
        ]
      }
    });

    // Merge with company-specific taking precedence
    const configMap = new Map();
    configs.forEach(config => {
      const key = `${config.module}.${config.configKey}`;
      if (!configMap.has(key) || config.companyId !== null) {
        configMap.set(key, config);
      }
    });

    return Object.fromEntries(configMap);
  }

  /**
   * Get tag mapping for terminology
   */
  static async getTagMapping(companyId: number | null, entityName: string) {
    const tag = await prisma.cfgTagMapping.findFirst({
      where: {
        OR: [
          { companyId, entityName },
          { companyId: null, entityName }
        ]
      },
      orderBy: { companyId: 'desc' }
    });

    return tag || { displayName: entityName, pluralName: `${entityName}s` };
  }

  /**
   * Get all tag mappings
   */
  static async getAllTagMappings(companyId: number | null) {
    const defaultTags = await prisma.cfgTagMapping.findMany({
      where: { companyId: null }
    });

    if (!companyId) {
      return Object.fromEntries(defaultTags.map(t => [t.entityName, t]));
    }

    const companyTags = await prisma.cfgTagMapping.findMany({
      where: { companyId }
    });

    // Merge company overrides over defaults
    const tagMap = new Map();
    defaultTags.forEach(tag => tagMap.set(tag.entityName, tag));
    companyTags.forEach(tag => tagMap.set(tag.entityName, tag));

    return Object.fromEntries(tagMap);
  }

  /**
   * Set tag mapping
   */
  static async setTagMapping(
    companyId: number | null,
    entityName: string,
    displayName: string,
    pluralName?: string
  ) {
    const existing = await prisma.cfgTagMapping.findFirst({
      where: {
        companyId,
        entityName
      }
    });

    if (existing) {
      return await prisma.cfgTagMapping.update({
        where: { id: existing.id },
        data: { displayName, pluralName }
      });
    } else {
      return await prisma.cfgTagMapping.create({
        data: {
          companyId,
          entityName,
          defaultName: entityName,
          displayName,
          pluralName
        }
      });
    }
  }
}