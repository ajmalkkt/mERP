import { create } from 'zustand';
import { apiClient } from '../services/apiClient';

// ───────────────────────────────────────────────
// Types
// ───────────────────────────────────────────────

export interface FieldMeta {
  fieldName: string;
  label: string;
  type: string;       // text, number, dropdown, date, email, textarea, lookup, boolean, etc.
  dataType: string;    // string, number, date, lookup, boolean
  required: boolean;
  gridVisible?: boolean;
  gridOrder?: number;
  formOrder?: number;
  formSection?: string;
  sortable?: boolean;
  searchable?: boolean;
  gridWidth?: number;
  maxLength?: number;
  options?: { value: string; label: string }[];
  lookupConfig?: { endpoint: string; labelField: string; valueField: string };
  readOnly?: boolean;
  visibilityRule?: string; // JSON condition
  source?: string; // master, txn, derived
}

export interface EntityMeta {
  entityName: string;
  tableName: string;
  fields: FieldMeta[];
}

export interface TagMappings {
  [systemName: string]: string;
}

export interface VoucherConfig {
  voucherType: string;
  module: string;
  headerFields: FieldMeta[];
  lineFields: FieldMeta[];
}

// ───────────────────────────────────────────────
// Store State
// ───────────────────────────────────────────────

interface MetadataState {
  // Tag mappings cache
  tags: TagMappings;
  tagsLoaded: boolean;

  // Entity field configs cache: entityName -> FieldMeta[]
  entityFields: Record<string, FieldMeta[]>;

  // Voucher configs cache: voucherType -> VoucherConfig
  voucherConfigs: Record<string, VoucherConfig>;

  // Loading states
  loading: boolean;
  error: string | null;

  // Actions
  loadTags: (companyId?: number) => Promise<void>;
  loadEntityFields: (entityName: string) => Promise<FieldMeta[]>;
  loadVoucherConfig: (voucherType: string) => Promise<VoucherConfig | null>;
  getTag: (systemName: string) => string;
  reloadAll: () => Promise<void>;
  clearCache: () => void;
}

// ───────────────────────────────────────────────
// Zustand Store
// ───────────────────────────────────────────────

export const useMetadataStore = create<MetadataState>((set, get) => ({
  tags: {},
  tagsLoaded: false,
  entityFields: {},
  voucherConfigs: {},
  loading: false,
  error: null,

  /**
   * Load tag mappings from the backend.
   * Tags define company-specific label overrides (e.g., "warehouse" → "Stock Point").
   */
  loadTags: async (companyId?: number) => {
    try {
      set({ loading: true, error: null });
      const params = companyId ? `?companyId=${companyId}` : '';
      const response = await apiClient.get<{ data: Array<{ entityName: string; displayName: string }> }>(
        `/config/tags${params}`
      );

      const tagMap: TagMappings = {};
      if (response?.data && Array.isArray(response.data)) {
        response.data.forEach((t) => {
          tagMap[t.entityName] = t.displayName;
        });
      }

      set({ tags: tagMap, tagsLoaded: true, loading: false });
    } catch (err: any) {
      console.warn('Failed to load tag mappings, using defaults:', err?.message);
      set({ tagsLoaded: true, loading: false });
    }
  },

  /**
   * Load field metadata for a specific entity.
   * Returns cached result if already loaded.
   */
  loadEntityFields: async (entityName: string) => {
    const cached = get().entityFields[entityName];
    if (cached) return cached;

    try {
      set({ loading: true, error: null });
      const response = await apiClient.get<{ data: { fields: any[] } }>(
        `/metadata/entities/${entityName}/fields`
      );

      const fields: FieldMeta[] = (response?.data?.fields || []).map((f: any) => ({
        fieldName: f.fieldName || f.field_name,
        label: f.label || f.fieldName || f.field_name,
        type: f.uiControl || f.ui_control || 'text',
        dataType: f.dataType || f.data_type || 'string',
        required: f.required || false,
        gridVisible: f.gridVisible ?? true,
        gridOrder: f.gridOrder ?? 0,
        formOrder: f.formOrder ?? 0,
        formSection: f.formSection || 'basic',
        sortable: f.sortable ?? true,
        searchable: f.searchable ?? false,
        maxLength: f.maxLength,
        options: f.options,
        readOnly: f.readOnly || false,
        source: f.source || 'master',
      }));

      set((state) => ({
        entityFields: { ...state.entityFields, [entityName]: fields },
        loading: false,
      }));

      return fields;
    } catch (err: any) {
      console.warn(`Failed to load fields for entity "${entityName}":`, err?.message);
      set({ loading: false });
      return [];
    }
  },

  /**
   * Load voucher type configuration.
   */
  loadVoucherConfig: async (voucherType: string) => {
    const cached = get().voucherConfigs[voucherType];
    if (cached) return cached;

    try {
      set({ loading: true, error: null });
      const response = await apiClient.get<{ data: any }>(
        `/metadata/vouchers/${voucherType}`
      );

      if (!response?.data) {
        set({ loading: false });
        return null;
      }

      const config: VoucherConfig = {
        voucherType: response.data.voucherType,
        module: response.data.module,
        headerFields: response.data.headerFields || [],
        lineFields: response.data.lineFields || [],
      };

      set((state) => ({
        voucherConfigs: { ...state.voucherConfigs, [voucherType]: config },
        loading: false,
      }));

      return config;
    } catch (err: any) {
      console.warn(`Failed to load voucher config for "${voucherType}":`, err?.message);
      set({ loading: false });
      return null;
    }
  },

  /**
   * Get a tag-mapped label. Falls back to the system name if no mapping exists.
   */
  getTag: (systemName: string) => {
    return get().tags[systemName] || systemName;
  },

  /**
   * Reload all cached data (tags + entity fields).
   */
  reloadAll: async () => {
    set({ tags: {}, tagsLoaded: false, entityFields: {}, voucherConfigs: {} });
    await get().loadTags();
  },

  /**
   * Clear all cached metadata.
   */
  clearCache: () => {
    set({
      tags: {},
      tagsLoaded: false,
      entityFields: {},
      voucherConfigs: {},
      error: null,
    });
  },
}));
