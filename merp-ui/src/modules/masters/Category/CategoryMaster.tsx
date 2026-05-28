import React, { useState, useEffect } from 'react';
import type { ColumnDef } from '@tanstack/react-table';
import GenericMasterScreen from '../../../components/GenericMasterScreen';
import { type FormFieldDef } from '../../../components/DynamicForm';
import { useFetch } from '../../../shared/hooks/useFetch';
import { apiClient } from '../../../erp-core/services/apiClient';

interface Category {
  id: string;
  code: string;
  name: string;
  module: string;
  parentId: number | null;
  level: number;
  status: string;
  parent?: { id: number; code: string; name: string } | null;
  _count?: { products: number; children: number };
}

const CategoryMaster: React.FC = () => {
  const [categories, setCategories] = useState<Category[]>([]);
  const [parentOptions, setParentOptions] = useState<{ value: string; label: string }[]>([]);
  const [companyId, setCompanyId] = useState<string | null>(null);
  const { loading } = useFetch();

  useEffect(() => {
    loadActiveCompany();
  }, []);

  useEffect(() => {
    if (companyId) {
      loadCategories();
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

  const loadCategories = async () => {
    try {
      const response = await apiClient.get(`/masters/categories?companyId=${companyId}&module=item&take=100`) as any;
      const data = response.data || [];
      setCategories(data);
      setParentOptions([
        { value: '', label: 'None (Root Level)' },
        ...data.map((c: Category) => ({
          value: String(c.id),
          label: `${c.code} - ${c.name}`,
        })),
      ]);
    } catch (err) {
      console.error('Failed to load categories:', err);
    }
  };

  const handleCreate = async (data: any) => {
    await apiClient.post('/masters/categories', {
      ...data,
      companyId: companyId ? parseInt(companyId) : undefined,
      module: 'item',
      parentId: data.parentId ? parseInt(data.parentId) : undefined,
    });
    await loadCategories();
  };

  const handleUpdate = async (id: string, data: any) => {
    await apiClient.put(`/masters/categories/${id}`, {
      ...data,
      parentId: data.parentId ? parseInt(data.parentId) : undefined,
    });
    await loadCategories();
  };

  const handleDelete = async (id: string) => {
    await apiClient.delete(`/masters/categories/${id}`);
    await loadCategories();
  };

  const columns: ColumnDef<Category>[] = [
    {
      accessorKey: 'code',
      header: 'Code',
      cell: ({ row }) => (
        <div style={{ paddingLeft: `${row.original.level * 16}px` }}>
          <span className="font-mono text-blue-700 font-medium">{row.original.code}</span>
        </div>
      ),
    },
    { accessorKey: 'name', header: 'Name' },
    {
      accessorFn: (row) => row.parent?.name || '—',
      id: 'parent',
      header: 'Parent',
    },
    {
      accessorFn: (row) => row._count?.products ?? 0,
      id: 'items',
      header: 'Items',
      cell: ({ getValue }) => (
        <span className="text-slate-500">{getValue() as number}</span>
      ),
    },
    {
      accessorKey: 'status',
      header: 'Status',
      cell: ({ row }) => (
        <span
          className={`px-3 py-1 rounded-full text-xs font-medium ${
            row.original.status === 'ACTIVE' ? 'bg-emerald-100 text-emerald-800' : 'bg-gray-100 text-gray-600'
          }`}
        >
          {row.original.status}
        </span>
      ),
    },
  ];

  const formFields: FormFieldDef[] = [
    { name: 'code', label: 'Category Code', type: 'text', required: true },
    { name: 'name', label: 'Category Name', type: 'text', required: true },
    {
      name: 'parentId',
      label: 'Parent Category',
      type: 'select',
      options: parentOptions,
      required: false,
    },
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
      title="Category Master"
      description="Manage item categories and classification"
      columns={columns}
      data={categories}
      isLoading={loading}
      onCreate={handleCreate}
      onUpdate={handleUpdate}
      onRemove={handleDelete}
      formFields={formFields}
    />
  );
};

export default CategoryMaster;
