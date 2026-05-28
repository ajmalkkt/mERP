import React, { useState, useEffect } from 'react';
import type { ColumnDef } from '@tanstack/react-table';
import GenericMasterScreen from '../../../components/GenericMasterScreen';
import { useFetch } from '../../../shared/hooks/useFetch';
import { apiClient } from '../../../erp-core/services/apiClient';
import type { FormFieldDef } from '../../../components/DynamicForm';

interface Branch {
  id: string;
  name: string;
  code: string;
  type: 'office' | 'warehouse' | 'factory';
  status: 'active' | 'inactive';
  companyId: string;
  createdAt: string;
}

const BranchMaster: React.FC = () => {
  const [branches, setBranches] = useState<Branch[]>([]);
  // Placeholder for companyId - in real app would come from auth context
  const [companyId, setCompanyId] = useState<string | null>(null);
  const { loading } = useFetch();

  useEffect(() => {
    loadActiveCompany();
  }, []);

  useEffect(() => {
    if (companyId) {
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

  const loadBranches = async () => {
    try {
      const response = await apiClient.get(`/masters/branches?companyId=${companyId}&take=100`);
      setBranches(response.data || []);
    } catch (err) {
      console.error('Failed to load branches:', err);
    }
  };

  const handleCreate = async (data: any) => {
    try {
      await apiClient.post('/masters/branches', { ...data, companyId });
      await loadBranches();
    } catch (err) {
      throw err;
    }
  };

  const handleUpdate = async (id: string, data: any) => {
    try {
      await apiClient.put(`/masters/branches/${id}`, data);
      await loadBranches();
    } catch (err) {
      throw err;
    }
  };

  const handleDelete = async (id: string) => {
    try {
      await apiClient.delete(`/masters/branches/${id}`);
      await loadBranches();
    } catch (err) {
      throw err;
    }
  };

  const columns: ColumnDef<Branch>[] = [
    {
      accessorKey: 'name',
      header: 'Name',
    },
    {
      accessorKey: 'code',
      header: 'Code',
    },
    {
      accessorKey: 'type',
      header: 'Type',
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
    { name: 'name', label: 'Branch Name', type: 'text', required: true },
    { name: 'code', label: 'Branch Code', type: 'text', required: true },
    {
      name: 'type',
      label: 'Branch Type',
      type: 'select',
      options: [
        { value: 'office', label: 'Office' },
        { value: 'warehouse', label: 'Warehouse' },
        { value: 'factory', label: 'Factory' },
      ],
      required: true,
    },
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
      title="Branch Master"
      description="Manage branches for your company"
      columns={columns}
      data={branches}
      isLoading={loading}
      onCreate={handleCreate}
      onUpdate={handleUpdate}
      onRemove={handleDelete}
      formFields={formFields}
    />
  );
};

export default BranchMaster;
