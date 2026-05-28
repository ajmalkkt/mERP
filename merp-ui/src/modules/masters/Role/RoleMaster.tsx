import React, { useState, useEffect } from 'react';
import type { ColumnDef } from '@tanstack/react-table';
import GenericMasterScreen from '../../../components/GenericMasterScreen';
import { useFetch } from '../../../shared/hooks/useFetch';
import { apiClient } from '../../../erp-core/services/apiClient';
import type { FormFieldDef } from '../../../components/DynamicForm';

interface Role {
  id: string;
  name: string;
  code: string;
  description?: string;
  hierarchyLevel: number;
  status: 'active' | 'inactive';
  companyId: string;
  createdAt: string;
}

const RoleMaster: React.FC = () => {
  const [roles, setRoles] = useState<Role[]>([]);
  // Placeholder for companyId
  const [companyId, setCompanyId] = useState<string | null>(null);
  const { loading } = useFetch();

  useEffect(() => {
    loadActiveCompany();
  }, []);

  useEffect(() => {
    if (companyId) {
      loadRoles();
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

  const loadRoles = async () => {
    try {
      const response = await apiClient.get(`/masters/roles?companyId=${companyId}&take=100`);
      setRoles(response.data || []);
    } catch (err) {
      console.error('Failed to load roles:', err);
    }
  };

  const handleCreate = async (data: any) => {
    try {
      await apiClient.post('/masters/roles', { ...data, companyId });
      await loadRoles();
    } catch (err) {
      throw err;
    }
  };

  const handleUpdate = async (id: string, data: any) => {
    try {
      await apiClient.put(`/masters/roles/${id}`, data);
      await loadRoles();
    } catch (err) {
      throw err;
    }
  };

  const handleDelete = async (id: string) => {
    try {
      await apiClient.delete(`/masters/roles/${id}`);
      await loadRoles();
    } catch (err) {
      throw err;
    }
  };

  const columns: ColumnDef<Role>[] = [
    {
      accessorKey: 'name',
      header: 'Role Name',
    },
    {
      accessorKey: 'code',
      header: 'Code',
    },
    {
      accessorKey: 'hierarchyLevel',
      header: 'Hierarchy Level',
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
    { name: 'name', label: 'Role Name', type: 'text', required: true },
    { name: 'code', label: 'Role Code', type: 'text', required: true },
    { name: 'description', label: 'Description', type: 'textarea', required: false },
    { name: 'hierarchyLevel', label: 'Hierarchy Level', type: 'number', required: false },
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
      title="Role Master"
      description="Manage roles and permissions"
      columns={columns}
      data={roles}
      isLoading={loading}
      onCreate={handleCreate}
      onUpdate={handleUpdate}
      onRemove={handleDelete}
      formFields={formFields}
    />
  );
};

export default RoleMaster;
