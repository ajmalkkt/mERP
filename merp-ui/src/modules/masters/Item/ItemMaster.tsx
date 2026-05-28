import React, { useState, useEffect } from 'react';
import type { ColumnDef } from '@tanstack/react-table';
import GenericMasterScreen from '../../../components/GenericMasterScreen';
import { type FormFieldDef } from '../../../components/DynamicForm';
import { useFetch } from '../../../shared/hooks/useFetch';
import { apiClient } from '../../../erp-core/services/apiClient';

interface Product {
  id: string;
  code: string;
  name: string;
  alias: string | null;
  description: string | null;
  categoryId: number | null;
  unitId: number | null;
  hsnCode: string | null;
  taxRate: number | null;
  purchasePrice: number | null;
  sellingPrice: number | null;
  reorderLevel: number | null;
  trackBatch: boolean;
  trackSerial: boolean;
  status: string;
  category?: { id: number; name: string; code: string } | null;
  unit?: { id: number; name: string; code: string; symbol: string } | null;
}

const ItemMaster: React.FC = () => {
  const [products, setProducts] = useState<Product[]>([]);
  const [categories, setCategories] = useState<{ value: string; label: string }[]>([]);
  const [units, setUnits] = useState<{ value: string; label: string }[]>([]);
  const [companyId, setCompanyId] = useState<string | null>(null);
  const { loading } = useFetch();

  useEffect(() => {
    loadActiveCompany();
  }, []);

  useEffect(() => {
    if (companyId) {
      loadProducts();
      loadLookups();
    }
  }, [companyId]);

  const loadActiveCompany = async () => {
    try {
      const response = await apiClient.get('/masters/companies?take=1');
      const company = response.data?.[0];
      if (company) {
        setCompanyId(String(company.id));
      }
    } catch (err) {
      console.error('Failed to load active company:', err);
    }
  };

  const loadProducts = async () => {
    try {
      const response = await apiClient.get(`/masters/products?companyId=${companyId}&take=100`) as any;
      setProducts(response.data || []);
    } catch (err) {
      console.error('Failed to load products:', err);
    }
  };

  const loadLookups = async () => {
    try {
      const [catRes, unitRes] = await Promise.all([
        apiClient.get(`/masters/categories?companyId=${companyId}&module=item&take=100`) as Promise<any>,
        apiClient.get(`/masters/units?companyId=${companyId}&take=100`) as Promise<any>,
      ]);
      setCategories(
        (catRes.data || []).map((c: any) => ({ value: String(c.id), label: `${c.code} - ${c.name}` }))
      );
      setUnits(
        (unitRes.data || []).map((u: any) => ({ value: String(u.id), label: `${u.code} - ${u.name} (${u.symbol})` }))
      );
    } catch (err) {
      console.error('Failed to load lookups:', err);
    }
  };

  const handleCreate = async (data: any) => {
    try {
      await apiClient.post('/masters/products', {
        ...data,
        companyId: companyId ? parseInt(companyId) : undefined,
        categoryId: data.categoryId ? parseInt(data.categoryId) : undefined,
        unitId: data.unitId ? parseInt(data.unitId) : undefined,
        taxRate: data.taxRate ? parseFloat(data.taxRate) : undefined,
        purchasePrice: data.purchasePrice ? parseFloat(data.purchasePrice) : undefined,
        sellingPrice: data.sellingPrice ? parseFloat(data.sellingPrice) : undefined,
        reorderLevel: data.reorderLevel ? parseFloat(data.reorderLevel) : undefined,
      });
      await loadProducts();
    } catch (err) {
      throw err;
    }
  };

  const handleUpdate = async (id: string, data: any) => {
    try {
      await apiClient.put(`/masters/products/${id}`, {
        ...data,
        categoryId: data.categoryId ? parseInt(data.categoryId) : undefined,
        unitId: data.unitId ? parseInt(data.unitId) : undefined,
        taxRate: data.taxRate ? parseFloat(data.taxRate) : undefined,
        purchasePrice: data.purchasePrice ? parseFloat(data.purchasePrice) : undefined,
        sellingPrice: data.sellingPrice ? parseFloat(data.sellingPrice) : undefined,
      });
      await loadProducts();
    } catch (err) {
      throw err;
    }
  };

  const handleDelete = async (id: string) => {
    try {
      await apiClient.delete(`/masters/products/${id}`);
      await loadProducts();
    } catch (err) {
      throw err;
    }
  };

  const columns: ColumnDef<Product>[] = [
    {
      accessorKey: 'code',
      header: 'Item Code',
      cell: ({ row }) => (
        <span className="font-mono text-blue-700 font-medium">{row.original.code}</span>
      ),
    },
    {
      accessorKey: 'name',
      header: 'Item Name',
    },
    {
      accessorFn: (row) => row.category?.name || '—',
      id: 'category',
      header: 'Category',
    },
    {
      accessorFn: (row) => row.unit?.symbol || '—',
      id: 'unit',
      header: 'Unit',
    },
    {
      accessorKey: 'sellingPrice',
      header: 'Selling Price',
      cell: ({ row }) => (
        <span className="font-mono text-right">
          {row.original.sellingPrice != null ? `₹ ${Number(row.original.sellingPrice).toLocaleString('en-IN', { minimumFractionDigits: 2 })}` : '—'}
        </span>
      ),
    },
    {
      accessorKey: 'purchasePrice',
      header: 'Purchase Price',
      cell: ({ row }) => (
        <span className="font-mono text-right">
          {row.original.purchasePrice != null ? `₹ ${Number(row.original.purchasePrice).toLocaleString('en-IN', { minimumFractionDigits: 2 })}` : '—'}
        </span>
      ),
    },
    {
      accessorKey: 'hsnCode',
      header: 'HSN Code',
      cell: ({ row }) => (
        <span className="text-slate-500">{row.original.hsnCode || '—'}</span>
      ),
    },
    {
      accessorKey: 'status',
      header: 'Status',
      cell: ({ row }) => (
        <span
          className={`px-3 py-1 rounded-full text-xs font-medium ${
            row.original.status === 'ACTIVE'
              ? 'bg-emerald-100 text-emerald-800'
              : 'bg-gray-100 text-gray-600'
          }`}
        >
          {row.original.status}
        </span>
      ),
    },
  ];

  const formFields: FormFieldDef[] = [
    { name: 'code', label: 'Item Code', type: 'text', required: true },
    { name: 'name', label: 'Item Name', type: 'text', required: true },
    { name: 'alias', label: 'Alias', type: 'text', required: false },
    { name: 'description', label: 'Description', type: 'text', required: false },
    {
      name: 'categoryId',
      label: 'Category',
      type: 'select',
      options: categories,
      required: false,
    },
    {
      name: 'unitId',
      label: 'Unit',
      type: 'select',
      options: units,
      required: false,
    },
    { name: 'hsnCode', label: 'HSN/SAC Code', type: 'text', required: false },
    { name: 'taxRate', label: 'Tax Rate (%)', type: 'text', required: false },
    { name: 'purchasePrice', label: 'Purchase Price', type: 'text', required: false },
    { name: 'sellingPrice', label: 'Selling Price', type: 'text', required: false },
    { name: 'reorderLevel', label: 'Reorder Level', type: 'text', required: false },
    {
      name: 'status',
      label: 'Status',
      type: 'select',
      options: [
        { value: 'ACTIVE', label: 'Active' },
        { value: 'INACTIVE', label: 'Inactive' },
      ],
      required: true,
    },
  ];

  return (
    <GenericMasterScreen
      title="Item Master"
      description="Manage products and items in your inventory"
      columns={columns}
      data={products}
      isLoading={loading}
      onCreate={handleCreate}
      onUpdate={handleUpdate}
      onRemove={handleDelete}
      formFields={formFields}
    />
  );
};

export default ItemMaster;
