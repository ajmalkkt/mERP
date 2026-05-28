import React, { useState, useEffect } from 'react';
import type { ColumnDef } from '@tanstack/react-table';
import GenericMasterScreen from '../../../components/GenericMasterScreen';
import { useFetch } from '../../../shared/hooks/useFetch';
import { apiClient } from '../../../erp-core/services/apiClient';
import type { FormFieldDef } from '../../../components/DynamicForm';

interface Company {
  id: string;
  name: string;
  code: string;
  status: 'active' | 'inactive';
  createdAt: string;
  createdBy: string;
}

const CompanyMaster: React.FC = () => {
  const [companies, setCompanies] = useState<Company[]>([]);
  const { loading } = useFetch();

  useEffect(() => {
    loadCompanies();
  }, []);

  const loadCompanies = async () => {
    try {
      const response = await apiClient.get('/masters/companies?take=100');
      setCompanies(response.data || []);
    } catch (err) {
      console.error('Failed to load companies:', err);
    }
  };

  const handleCreate = async (data: any) => {
    try {
      await apiClient.post('/masters/companies', data);
      await loadCompanies();
    } catch (err) {
      throw err;
    }
  };

  const handleUpdate = async (id: string, data: any) => {
    try {
      await apiClient.put(`/masters/companies/${id}`, data);
      await loadCompanies();
    } catch (err) {
      throw err;
    }
  };

  const handleDelete = async (id: string) => {
    try {
      await apiClient.delete(`/masters/companies/${id}`);
      await loadCompanies();
    } catch (err) {
      throw err;
    }
  };

  const columns: ColumnDef<Company>[] = [
    {
      accessorKey: 'name',
      header: 'Name',
    },
    {
      accessorKey: 'code',
      header: 'Code',
    },
    {
      accessorKey: 'status',
      header: 'Status',
      cell: ({ row }) => (
        <span
          className={`px-3 py-1 rounded-full text-xs font-medium ${
            row.original.status === 'active'
              ? 'bg-green-100 text-green-800'
              : 'bg-gray-100 text-gray-800'
          }`}
        >
          {row.original.status}
        </span>
      ),
    },
  ];

  const formFields: FormFieldDef[] = [
    { name: 'name', label: 'Company Name', type: 'text', required: true },
    { name: 'code', label: 'Company Code', type: 'text', required: true },
    {
      name: 'status',
      label: 'Status',
      type: 'select',
      options: [
        { value: 'active', label: 'Active' },
        { value: 'inactive', label: 'Inactive' },
      ],
      required: true,
    },
  ];

  return (
    <GenericMasterScreen
      title="Company Master"
      description="Manage companies in your ERP system"
      columns={columns}
      data={companies}
      isLoading={loading}
      onCreate={handleCreate}
      onUpdate={handleUpdate}
      onRemove={handleDelete}
      formFields={formFields}
    />
  );
};

export default CompanyMaster;
