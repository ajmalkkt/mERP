import React, { useState, useEffect } from 'react';
import type { ColumnDef } from '@tanstack/react-table';
import GenericMasterScreen from '../../../components/GenericMasterScreen';
import { type FormFieldDef } from '../../../components/DynamicForm';
import { useFetch } from '../../../shared/hooks/useFetch';
import { apiClient } from '../../../erp-core/services/apiClient';

interface Warehouse {
  id: string;
  code: string;
  name: string;
  alias: string | null;
  type: string;
  branchId: number;
  address: string | null;
  status: string;
}

const warehouseTypeColors: Record<string, string> = {
  main: 'bg-blue-100 text-blue-800',
  transit: 'bg-amber-100 text-amber-800',
  scrap: 'bg-red-100 text-red-800',
  production: 'bg-purple-100 text-purple-800',
};

const WarehouseMaster: React.FC = () => {
  const [warehouses, setWarehouses] = useState<Warehouse[]>([]);
  const [branches, setBranches] = useState<{ value: string; label: string }[]>([]);
  const [companyId, setCompanyId] = useState<string | null>(null);
  const { loading } = useFetch();

  useEffect(() => {
    loadActiveCompany();
  }, []);

  useEffect(() => {
    if (companyId) {
      loadWarehouses();
      loadBranches();
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

  const loadWarehouses = async () => {
    try {
      const response = await apiClient.get(`/masters/warehouses?companyId=${companyId}&take=100`) as any;
      setWarehouses(response.data || []);
    } catch (err) {
      console.error('Failed to load warehouses:', err);
    }
  };

  const loadBranches = async () => {
    try {
      const response = await apiClient.get(`/masters/branches?companyId=${companyId}&take=100`) as any;
      setBranches(
        (response.data || []).map((b: any) => ({ value: String(b.id), label: `${b.code} - ${b.name}` }))
      );
    } catch (err) {
      console.error('Failed to load branches:', err);
    }
  };

  const handleCreate = async (data: any) => {
    await apiClient.post('/masters/warehouses', {
      ...data,
      companyId: companyId ? parseInt(companyId) : undefined,
      branchId: data.branchId ? parseInt(data.branchId) : undefined,
    });
    await loadWarehouses();
  };

  const handleUpdate = async (id: string, data: any) => {
    await apiClient.put(`/masters/warehouses/${id}`, {
      ...data,
      branchId: data.branchId ? parseInt(data.branchId) : undefined,
    });
    await loadWarehouses();
  };

  const handleDelete = async (id: string) => {
    await apiClient.delete(`/masters/warehouses/${id}`);
    await loadWarehouses();
  };

  const columns: ColumnDef<Warehouse>[] = [
    {
      accessorKey: 'code',
      header: 'Code',
      cell: ({ row }) => (
        <span className="font-mono text-blue-700 font-medium">{row.original.code}</span>
      ),
    },
    { accessorKey: 'name', header: 'Name' },
    {
      accessorKey: 'type',
      header: 'Type',
      cell: ({ row }) => (
        <span
          className={`px-3 py-1 rounded-full text-xs font-medium capitalize ${
            warehouseTypeColors[row.original.type] || 'bg-gray-100 text-gray-600'
          }`}
        >
          {row.original.type}
        </span>
      ),
    },
    {
      accessorKey: 'address',
      header: 'Address',
      cell: ({ row }) => (
        <span className="text-slate-500 text-sm truncate max-w-[200px] block">
          {row.original.address || '—'}
        </span>
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
    { name: 'code', label: 'Warehouse Code', type: 'text', required: true },
    { name: 'name', label: 'Warehouse Name', type: 'text', required: true },
    { name: 'alias', label: 'Alias', type: 'text', required: false },
    {
      name: 'branchId',
      label: 'Branch',
      type: 'select',
      options: branches,
      required: true,
    },
    {
      name: 'type',
      label: 'Type',
      type: 'select',
      options: [
        { value: 'main', label: 'Main' },
        { value: 'transit', label: 'Transit' },
        { value: 'scrap', label: 'Scrap' },
        { value: 'production', label: 'Production' },
      ],
      required: true,
    },
    { name: 'address', label: 'Address', type: 'text', required: false },
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
      title="Warehouse Master"
      description="Manage warehouses, storage locations, and distribution points"
      columns={columns}
      data={warehouses}
      isLoading={loading}
      onCreate={handleCreate}
      onUpdate={handleUpdate}
      onRemove={handleDelete}
      formFields={formFields}
    />
  );
};

export default WarehouseMaster;
