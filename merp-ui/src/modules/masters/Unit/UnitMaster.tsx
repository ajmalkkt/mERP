import React, { useState, useEffect } from 'react';
import type { ColumnDef } from '@tanstack/react-table';
import GenericMasterScreen from '../../../components/GenericMasterScreen';
import { type FormFieldDef } from '../../../components/DynamicForm';
import { useFetch } from '../../../shared/hooks/useFetch';
import { apiClient } from '../../../erp-core/services/apiClient';

interface Unit {
  id: string;
  code: string;
  name: string;
  symbol: string;
  decimalPlaces: number;
  status: string;
  _count?: { products: number };
}

const UnitMaster: React.FC = () => {
  const [units, setUnits] = useState<Unit[]>([]);
  const [companyId, setCompanyId] = useState<string | null>(null);
  const { loading } = useFetch();

  useEffect(() => {
    loadActiveCompany();
  }, []);

  useEffect(() => {
    if (companyId) {
      loadUnits();
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

  const loadUnits = async () => {
    try {
      const response = await apiClient.get(`/masters/units?companyId=${companyId}&take=100`) as any;
      setUnits(response.data || []);
    } catch (err) {
      console.error('Failed to load units:', err);
    }
  };

  const handleCreate = async (data: any) => {
    await apiClient.post('/masters/units', {
      ...data,
      companyId: companyId ? parseInt(companyId) : undefined,
      decimalPlaces: data.decimalPlaces ? parseInt(data.decimalPlaces) : 2,
    });
    await loadUnits();
  };

  const handleUpdate = async (id: string, data: any) => {
    await apiClient.put(`/masters/units/${id}`, {
      ...data,
      decimalPlaces: data.decimalPlaces ? parseInt(data.decimalPlaces) : undefined,
    });
    await loadUnits();
  };

  const handleDelete = async (id: string) => {
    await apiClient.delete(`/masters/units/${id}`);
    await loadUnits();
  };

  const columns: ColumnDef<Unit>[] = [
    {
      accessorKey: 'code',
      header: 'Code',
      cell: ({ row }) => (
        <span className="font-mono text-blue-700 font-medium">{row.original.code}</span>
      ),
    },
    { accessorKey: 'name', header: 'Name' },
    {
      accessorKey: 'symbol',
      header: 'Symbol',
      cell: ({ row }) => (
        <span className="bg-slate-100 px-2 py-1 rounded text-sm font-mono">{row.original.symbol}</span>
      ),
    },
    {
      accessorKey: 'decimalPlaces',
      header: 'Decimals',
    },
    {
      accessorFn: (row) => row._count?.products ?? 0,
      id: 'products',
      header: 'Products',
      cell: ({ getValue }) => <span className="text-slate-500">{getValue() as number}</span>,
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
    { name: 'code', label: 'Unit Code', type: 'text', required: true },
    { name: 'name', label: 'Unit Name', type: 'text', required: true },
    { name: 'symbol', label: 'Symbol (e.g. Kg, Pcs, L)', type: 'text', required: true },
    { name: 'decimalPlaces', label: 'Decimal Places', type: 'text', required: false },
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
      title="Unit Master"
      description="Manage units of measurement (Kg, Pcs, Liters, etc.)"
      columns={columns}
      data={units}
      isLoading={loading}
      onCreate={handleCreate}
      onUpdate={handleUpdate}
      onRemove={handleDelete}
      formFields={formFields}
    />
  );
};

export default UnitMaster;
