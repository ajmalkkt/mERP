import React, { useState, useEffect } from 'react';
import type { ColumnDef } from '@tanstack/react-table';
import GenericMasterScreen from '../../../components/GenericMasterScreen';
import { useFetch } from '../../../shared/hooks/useFetch';
import { apiClient } from '../../../erp-core/services/apiClient';
import type { FormFieldDef } from '../../../components/DynamicForm';

interface Department {
  id: string;
  name: string;
  code: string;
  status: 'active' | 'inactive';
  companyId: string;
  branchId: string;
  createdAt: string;
}

const DepartmentMaster: React.FC = () => {
  const [departments, setDepartments] = useState<Department[]>([]);
  // Placeholders for branch and company
  const [companyId, setCompanyId] = useState<string | null>(null);
  const [branchId, setBranchId] = useState<string | null>(null);
  const { loading } = useFetch();

  useEffect(() => {
    loadActiveCompanyAndBranch();
  }, []);

  useEffect(() => {
    if (branchId) {
      loadDepartments();
    }
  }, [branchId]);

  const loadActiveCompanyAndBranch = async () => {
    try {
      const compRes = await apiClient.get('/masters/companies?take=1');
      const company = compRes.data?.[0];
      if (company) {
        setCompanyId(String(company.id));
        const branchRes = await apiClient.get(`/masters/branches?companyId=${company.id}&take=1`);
        const branch = branchRes.data?.[0];
        if (branch) {
          setBranchId(String(branch.id));
        }
      }
    } catch (err) {
      console.error('Failed to load active company/branch:', err);
    }
  };

  const loadDepartments = async () => {
    try {
      const response = await apiClient.get(`/masters/departments?branchId=${branchId}&take=100`);
      setDepartments(response.data || []);
    } catch (err) {
      console.error('Failed to load departments:', err);
    }
  };

  const handleCreate = async (data: any) => {
    try {
      await apiClient.post('/masters/departments', { ...data, companyId, branchId });
      await loadDepartments();
    } catch (err) {
      throw err;
    }
  };

  const handleUpdate = async (id: string, data: any) => {
    try {
      await apiClient.put(`/masters/departments/${id}`, data);
      await loadDepartments();
    } catch (err) {
      throw err;
    }
  };

  const handleDelete = async (id: string) => {
    try {
      await apiClient.delete(`/masters/departments/${id}`);
      await loadDepartments();
    } catch (err) {
      throw err;
    }
  };

  const columns: ColumnDef<Department>[] = [
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
    { name: 'name', label: 'Department Name', type: 'text', required: true },
    { name: 'code', label: 'Department Code', type: 'text', required: true },
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
      title="Department Master"
      description="Manage departments for your branch"
      columns={columns}
      data={departments}
      isLoading={loading}
      onCreate={handleCreate}
      onUpdate={handleUpdate}
      onRemove={handleDelete}
      formFields={formFields}
    />
  );
};

export default DepartmentMaster;
