import { PrismaClient } from '@prisma/client';
import { ConfigurationService } from './configurationService';

const prisma = new PrismaClient();

/**
 * MetadataService — The brain of the ERP.
 * Powers 10 engines: Entity Metadata, Dynamic Fields, Tag Mapping,
 * Voucher Config, Derived Fields, UI Layout, Number Sequences, etc.
 */
export class MetadataService {
  // ═══════════════════════════════════════════════
  // ENGINE 1: Entity Metadata
  // ═══════════════════════════════════════════════

  /**
   * List all registered entities.
   */
  static async listEntities() {
    return prisma.metaEntity.findMany({
      select: {
        id: true,
        entityName: true,
        tableName: true,
      },
      orderBy: { entityName: 'asc' },
    });
  }

  /**
   * Get entity definition with all its fields.
   */
  static async getEntityWithFields(entityName: string) {
    return prisma.metaEntity.findUnique({
      where: { entityName },
      include: {
        fields: {
          orderBy: { id: 'asc' },
        },
      },
    });
  }

  /**
   * Get field metadata for an entity (used by UI for form/grid rendering).
   * Merges system fields with custom fields (dynamic extensions).
   */
  static async getEntityFields(entityName: string, companyId?: number) {
    // 1. Get system fields from meta_field
    const entity = await prisma.metaEntity.findUnique({
      where: { entityName },
      include: {
        fields: {
          orderBy: { id: 'asc' },
        },
      },
    });

    if (!entity) {
      return { entityName, fields: [] };
    }

    const systemFields = entity.fields.map((f) => ({
      fieldName: f.fieldName,
      label: f.fieldName, // Will be overridden by tag mappings
      dataType: f.dataType,
      uiControl: f.uiControl,
      required: f.required,
      source: f.source,
      isSystem: true,
      gridVisible: true,
      gridOrder: f.id,
      formOrder: f.id,
      formSection: 'General',
    }));

    // 2. Get custom fields (dynamic extensions) if companyId provided
    let customFields: any[] = [];
    if (companyId) {
      const extValues = await prisma.extEntityValue.findMany({
        where: { entityName },
        include: {
          metaField: true,
        },
      });

      // Deduplicate by fieldId
      const seen = new Set<number>();
      extValues.forEach((ev) => {
        if (!seen.has(ev.fieldId)) {
          seen.add(ev.fieldId);
          customFields.push({
            fieldName: ev.metaField.fieldName,
            label: ev.metaField.fieldName,
            dataType: ev.metaField.dataType,
            uiControl: ev.metaField.uiControl,
            required: ev.metaField.required,
            source: 'custom',
            isSystem: false,
            gridVisible: false,
            gridOrder: 999,
            formOrder: 999,
            formSection: 'Custom Fields',
          });
        }
      });
    }

    return {
      entityName: entity.entityName,
      tableName: entity.tableName,
      fields: [...systemFields, ...customFields],
    };
  }

  /**
   * Register a new entity in the metadata system.
   */
  static async createEntity(entityName: string, tableName: string) {
    return prisma.metaEntity.create({
      data: { entityName, tableName },
    });
  }

  /**
   * Add a field definition to an entity.
   */
  static async addField(entityId: number, data: {
    fieldName: string;
    dataType: string;
    source: string;
    uiControl: string;
    required?: boolean;
  }) {
    return prisma.metaField.create({
      data: {
        entityId,
        fieldName: data.fieldName,
        dataType: data.dataType,
        source: data.source,
        uiControl: data.uiControl,
        required: data.required || false,
      },
    });
  }

  /**
   * Update a field definition.
   */
  static async updateField(fieldId: number, data: Partial<{
    fieldName: string;
    dataType: string;
    source: string;
    uiControl: string;
    required: boolean;
  }>) {
    return prisma.metaField.update({
      where: { id: fieldId },
      data,
    });
  }

  /**
   * Delete a field definition.
   */
  static async deleteField(fieldId: number) {
    return prisma.metaField.delete({
      where: { id: fieldId },
    });
  }

  // ═══════════════════════════════════════════════
  // ENGINE 2: Dynamic Fields (u00x Replacement)
  // ═══════════════════════════════════════════════

  /**
   * Get custom field values for an entity record.
   */
  static async getCustomFieldValues(entityName: string, entityId: number) {
    const values = await prisma.extEntityValue.findMany({
      where: { entityName, entityId },
      include: { metaField: true },
    });

    return values.map((v) => ({
      fieldName: v.metaField.fieldName,
      value: v.value,
      dataType: v.metaField.dataType,
    }));
  }

  /**
   * Save custom field values for an entity record.
   * Uses upsert to handle both create and update.
   */
  static async saveCustomFieldValues(
    entityName: string,
    entityId: number,
    fieldValues: { fieldId: number; value: string }[]
  ) {
    const operations = fieldValues.map((fv) =>
      prisma.extEntityValue.upsert({
        where: {
          entityName_entityId_fieldId: {
            entityName,
            entityId,
            fieldId: fv.fieldId,
          },
        },
        update: { value: fv.value },
        create: {
          entityName,
          entityId,
          fieldId: fv.fieldId,
          value: fv.value,
        },
      })
    );

    return prisma.$transaction(operations);
  }

  /**
   * Delete a custom field value.
   */
  static async deleteCustomFieldValue(entityName: string, entityId: number, fieldId: number) {
    return prisma.extEntityValue.delete({
      where: {
        entityName_entityId_fieldId: {
          entityName,
          entityId,
          fieldId,
        },
      },
    });
  }

  // ═══════════════════════════════════════════════
  // ENGINE 3: Tag Mapping (delegates to ConfigurationService)
  // ═══════════════════════════════════════════════

  /**
   * Get all tag mappings for a company (or global).
   */
  static async getTagMappings(companyId?: number) {
    return ConfigurationService.getAllTagMappings(companyId || null);
  }

  /**
   * Resolve a single tag.
   */
  static async resolveTag(entityName: string, companyId?: number): Promise<string> {
    const tag = await ConfigurationService.getTagMapping(companyId || null, entityName);
    return tag?.displayName || entityName;
  }

  /**
   * Set a tag mapping.
   */
  static async setTagMapping(companyId: number | null, entityName: string, displayName: string, pluralName?: string) {
    return ConfigurationService.setTagMapping(companyId, entityName, displayName, pluralName);
  }

  // ═══════════════════════════════════════════════
  // ENGINE 4: Voucher Configuration
  // ═══════════════════════════════════════════════

  /**
   * List all voucher type definitions.
   */
  static async listVoucherTypes() {
    return prisma.metaVoucherDefinition.findMany({
      orderBy: { module: 'asc' },
    });
  }

  /**
   * Get full voucher configuration including header and line fields.
   */
  static async getVoucherConfig(voucherType: string) {
    const def = await prisma.metaVoucherDefinition.findUnique({
      where: { voucherType },
      include: {
        fields: {
          include: {
            metaField: true,
          },
        },
      },
    });

    if (!def) return null;

    return {
      voucherType: def.voucherType,
      module: def.module,
      fields: def.fields.map((vf) => ({
        fieldName: vf.metaField.fieldName,
        dataType: vf.metaField.dataType,
        uiControl: vf.metaField.uiControl,
        required: vf.metaField.required,
        source: vf.metaField.source,
      })),
    };
  }

  /**
   * Create a new voucher type definition.
   */
  static async createVoucherType(voucherType: string, module: string) {
    return prisma.metaVoucherDefinition.create({
      data: { voucherType, module },
    });
  }

  /**
   * Link a field to a voucher type.
   */
  static async addVoucherField(voucherId: number, fieldId: number) {
    return prisma.metaVoucherField.create({
      data: { voucherId, fieldId },
    });
  }

  /**
   * Remove a field from a voucher type.
   */
  static async removeVoucherField(voucherId: number, fieldId: number) {
    return prisma.metaVoucherField.delete({
      where: {
        voucherId_fieldId: { voucherId, fieldId },
      },
    });
  }

  // ═══════════════════════════════════════════════
  // ENGINE 8: Number Sequences
  // ═══════════════════════════════════════════════

  /**
   * Generate the next number in a sequence.
   * Uses row locking to prevent duplicates in concurrent environments.
   */
  static async generateNumber(
    companyId: number,
    voucherType: string,
    branchId?: number,
    financialYear?: string
  ): Promise<string> {
    const fy = financialYear || MetadataService.getCurrentFinancialYear();

    // Use raw query with FOR UPDATE to lock the row
    const result = await prisma.$transaction(async (tx) => {
      // Find or create sequence
      let sequence = await tx.seqNumberSequence.findFirst({
        where: {
          companyId,
          voucherType,
          branchId: branchId || null,
          financialYear: fy,
          isActive: true,
        },
      });

      if (!sequence) {
        // Auto-create sequence with default pattern
        const prefix = voucherType.substring(0, 3).toUpperCase();
        sequence = await tx.seqNumberSequence.create({
          data: {
            companyId,
            branchId: branchId || null,
            voucherType,
            prefix,
            pattern: `{PREFIX}-{YYYY}-{####}`,
            financialYear: fy,
            lastNumber: 0,
            padLength: 4,
          },
        });
      }

      // Increment the counter
      const updated = await tx.seqNumberSequence.update({
        where: { id: sequence.id },
        data: { lastNumber: sequence.lastNumber + 1 },
      });

      // Generate the formatted number
      return MetadataService.formatSequenceNumber(updated);
    });

    return result;
  }

  /**
   * Get sequence details (for admin display).
   */
  static async getSequences(companyId: number) {
    return prisma.seqNumberSequence.findMany({
      where: { companyId },
      orderBy: [{ voucherType: 'asc' }, { financialYear: 'desc' }],
    });
  }

  /**
   * Create or update a number sequence definition.
   */
  static async upsertSequence(data: {
    companyId: number;
    branchId?: number;
    voucherType: string;
    prefix: string;
    pattern: string;
    financialYear: string;
    padLength?: number;
  }) {
    const existing = await prisma.seqNumberSequence.findFirst({
      where: {
        companyId: data.companyId,
        branchId: data.branchId || null,
        voucherType: data.voucherType,
        financialYear: data.financialYear,
      },
    });

    if (existing) {
      return prisma.seqNumberSequence.update({
        where: { id: existing.id },
        data: {
          prefix: data.prefix,
          pattern: data.pattern,
          padLength: data.padLength || 4,
        },
      });
    }

    return prisma.seqNumberSequence.create({
      data: {
        companyId: data.companyId,
        branchId: data.branchId || null,
        voucherType: data.voucherType,
        prefix: data.prefix,
        pattern: data.pattern,
        financialYear: data.financialYear,
        padLength: data.padLength || 4,
      },
    });
  }

  // ═══════════════════════════════════════════════
  // Helper Methods
  // ═══════════════════════════════════════════════

  /**
   * Format a sequence number from its pattern.
   * Supports: {PREFIX}, {BRANCH}, {YYYY}, {YY}, {MM}, {DD}, {####}
   */
  private static formatSequenceNumber(seq: {
    prefix: string;
    pattern: string;
    financialYear: string;
    lastNumber: number;
    padLength: number;
    branchId?: number | null;
  }): string {
    const now = new Date();
    const paddedNumber = String(seq.lastNumber).padStart(seq.padLength, '0');

    let result = seq.pattern
      .replace('{PREFIX}', seq.prefix)
      .replace('{YYYY}', now.getFullYear().toString())
      .replace('{YY}', now.getFullYear().toString().slice(-2))
      .replace('{MM}', (now.getMonth() + 1).toString().padStart(2, '0'))
      .replace('{DD}', now.getDate().toString().padStart(2, '0'))
      .replace('{FY}', seq.financialYear);

    // Replace the number placeholder (any sequence of #)
    result = result.replace(/\{#+\}/, paddedNumber);

    // Replace branch placeholder
    if (seq.branchId) {
      result = result.replace('{BRANCH}', String(seq.branchId));
    } else {
      result = result.replace('{BRANCH}', '');
      // Clean up double dashes
      result = result.replace(/--/g, '-');
    }

    return result;
  }

  /**
   * Get the current financial year string (e.g., "2025-26").
   * Financial year starts April 1 in India.
   */
  private static getCurrentFinancialYear(): string {
    const now = new Date();
    const year = now.getFullYear();
    const month = now.getMonth() + 1;

    if (month >= 4) {
      return `${year}-${(year + 1).toString().slice(-2)}`;
    }
    return `${year - 1}-${year.toString().slice(-2)}`;
  }
}
