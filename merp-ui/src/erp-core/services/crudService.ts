import { apiClient } from './apiClient';

// ───────────────────────────────────────────────
// Types
// ───────────────────────────────────────────────

export interface ListParams {
  skip?: number;
  take?: number;
  search?: string;
  status?: string;
  sortBy?: string;
  sortDir?: 'asc' | 'desc';
  [key: string]: any; // additional filters
}

export interface PagedResponse<T> {
  data: T[];
  total: number;
  skip: number;
  take: number;
}

export interface ApiResponse<T> {
  success: boolean;
  data: T;
  message?: string;
}

export interface BulkRequest<T> {
  action: 'create' | 'update' | 'delete';
  items: Partial<T>[];
}

export interface ExportParams {
  format: 'csv' | 'xlsx';
  fields?: string[];
  filters?: Record<string, any>;
}

// ───────────────────────────────────────────────
// CRUD Service Factory
// ───────────────────────────────────────────────

/**
 * Creates a fully typed CRUD service for any entity endpoint.
 * 
 * Usage:
 *   const itemService = createCrudService<Item>('/masters/items');
 *   const items = await itemService.list({ take: 50, search: 'drill' });
 *   const item = await itemService.getById('123');
 *   await itemService.create({ name: 'New Item', code: 'ITM-001' });
 */
export function createCrudService<T>(entityEndpoint: string) {
  return {
    /**
     * List entities with pagination, search, and filters.
     */
    list: async (params: ListParams = {}): Promise<PagedResponse<T>> => {
      const queryParams = new URLSearchParams();
      Object.entries(params).forEach(([key, value]) => {
        if (value !== undefined && value !== null && value !== '') {
          queryParams.set(key, String(value));
        }
      });
      const query = queryParams.toString();
      const url = query ? `${entityEndpoint}?${query}` : entityEndpoint;
      return apiClient.get<PagedResponse<T>>(url);
    },

    /**
     * Get a single entity by ID.
     */
    getById: async (id: string | number): Promise<T> => {
      return apiClient.get<T>(`${entityEndpoint}/${id}`);
    },

    /**
     * Create a new entity.
     */
    create: async (data: Partial<T>): Promise<T> => {
      return apiClient.post<T>(entityEndpoint, data);
    },

    /**
     * Update an existing entity.
     */
    update: async (id: string | number, data: Partial<T>): Promise<T> => {
      return apiClient.put<T>(`${entityEndpoint}/${id}`, data);
    },

    /**
     * Delete (or deactivate) an entity.
     */
    remove: async (id: string | number): Promise<void> => {
      return apiClient.delete(`${entityEndpoint}/${id}`);
    },

    /**
     * Bulk operations (create, update, delete).
     */
    bulk: async (data: BulkRequest<T>): Promise<ApiResponse<T[]>> => {
      return apiClient.post<ApiResponse<T[]>>(`${entityEndpoint}/bulk`, data);
    },

    /**
     * Export data as CSV or Excel.
     */
    export: async (params: ExportParams): Promise<Blob> => {
      const response = await apiClient.getClient().get(`${entityEndpoint}/export`, {
        params,
        responseType: 'blob',
      });
      return response.data;
    },
  };
}
