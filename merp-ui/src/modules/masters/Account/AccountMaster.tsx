import React, { useState, useEffect } from 'react';
import type { ColumnDef } from '@tanstack/react-table';
import GenericMasterScreen from '../../../components/GenericMasterScreen';
import { type FormFieldDef } from '../../../components/DynamicForm';
import { useFetch } from '../../../shared/hooks/useFetch';
import { apiClient } from '../../../erp-core/services/apiClient';

interface Account {
  id: string;
  code: string;
  name: string;
  alias: string | null;
  accountType: string;
  parentId: number | null;
  isGroup: boolean;
  subledgerType: string | null;
  openingBalance: number;
  currencyCode: string;
  level: number;
  status: string;
  parent?: { id: number; code: string; name: string } | null;
  _count?: { children: number };
}

const ACCOUNT_TYPES = [
  { value: 'ASSET', label: 'Asset' },
  { value: 'LIABILITY', label: 'Liability' },
  { value: 'EQUITY', label: 'Equity' },
  { value: 'INCOME', label: 'Income' },
  { value: 'EXPENSE', label: 'Expense' },
];

const SUBLEDGER_TYPES = [
  { value: '', label: 'None' },
  { value: 'CUSTOMER', label: 'Customer' },
  { value: 'VENDOR', label: 'Vendor' },
  { value: 'BANK', label: 'Bank' },
  { value: 'CASH', label: 'Cash' },
];

const accountTypeColors: Record<string, string> = {
  ASSET: 'bg-blue-100 text-blue-800',
  LIABILITY: 'bg-orange-100 text-orange-800',
  EQUITY: 'bg-purple-100 text-purple-800',
  INCOME: 'bg-green-100 text-green-800',
  EXPENSE: 'bg-red-100 text-red-800',
};

const AccountMaster: React.FC = () => {
  const [accounts, setAccounts] = useState<Account[]>([]);
  const [parentAccounts, setParentAccounts] = useState<{ value: string; label: string }[]>([]);
  const [companyId, setCompanyId] = useState<string | null>(null);
  const { loading } = useFetch();

  useEffect(() => {
    loadActiveCompany();
  }, []);

  useEffect(() => {
    if (companyId) {
      loadAccounts();
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

  const loadAccounts = async () => {
    try {
      const response = await apiClient.get(`/masters/accounts?companyId=${companyId}&take=200`) as any;
      const data = response.data || [];
      setAccounts(data);

      // Build parent dropdown (only group accounts)
      setParentAccounts([
        { value: '', label: 'None (Root Level)' },
        ...data
          .filter((a: Account) => a.isGroup)
          .map((a: Account) => ({
            value: String(a.id),
            label: `${a.code} - ${a.name}`,
          })),
      ]);
    } catch (err) {
      console.error('Failed to load accounts:', err);
    }
  };

  const handleCreate = async (data: any) => {
    try {
      await apiClient.post('/masters/accounts', {
        ...data,
        companyId: companyId ? parseInt(companyId) : undefined,
        parentId: data.parentId ? parseInt(data.parentId) : undefined,
        isGroup: data.isGroup === 'true' || data.isGroup === true,
        openingBalance: data.openingBalance ? parseFloat(data.openingBalance) : 0,
      });
      await loadAccounts();
    } catch (err) {
      throw err;
    }
  };

  const handleUpdate = async (id: string, data: any) => {
    try {
      await apiClient.put(`/masters/accounts/${id}`, {
        ...data,
        parentId: data.parentId ? parseInt(data.parentId) : undefined,
        isGroup: data.isGroup === 'true' || data.isGroup === true,
        openingBalance: data.openingBalance ? parseFloat(data.openingBalance) : undefined,
      });
      await loadAccounts();
    } catch (err) {
      throw err;
    }
  };

  const handleDelete = async (id: string) => {
    try {
      await apiClient.delete(`/masters/accounts/${id}`);
      await loadAccounts();
    } catch (err) {
      throw err;
    }
  };

  const columns: ColumnDef<Account>[] = [
    {
      accessorKey: 'code',
      header: 'Account Code',
      cell: ({ row }) => {
        const indent = row.original.level * 20;
        return (
          <div style={{ paddingLeft: `${indent}px` }} className="flex items-center gap-2">
            {row.original.isGroup && (
              <span className="text-amber-500 text-xs">📁</span>
            )}
            <span className="font-mono text-blue-700 font-medium">{row.original.code}</span>
          </div>
        );
      },
    },
    {
      accessorKey: 'name',
      header: 'Account Name',
      cell: ({ row }) => (
        <span className={row.original.isGroup ? 'font-semibold text-slate-900' : 'text-slate-700'}>
          {row.original.name}
        </span>
      ),
    },
    {
      accessorKey: 'accountType',
      header: 'Type',
      cell: ({ row }) => (
        <span
          className={`px-3 py-1 rounded-full text-xs font-medium ${
            accountTypeColors[row.original.accountType] || 'bg-gray-100 text-gray-600'
          }`}
        >
          {row.original.accountType}
        </span>
      ),
    },
    {
      accessorKey: 'isGroup',
      header: 'Group',
      cell: ({ row }) => (
        <span className={`text-xs ${row.original.isGroup ? 'text-amber-600 font-semibold' : 'text-slate-400'}`}>
          {row.original.isGroup ? 'Group' : 'Ledger'}
        </span>
      ),
    },
    {
      accessorFn: (row) => row.parent?.name || '—',
      id: 'parent',
      header: 'Parent Account',
    },
    {
      accessorKey: 'subledgerType',
      header: 'Subledger',
      cell: ({ row }) => (
        <span className="text-slate-500 text-sm">
          {row.original.subledgerType || '—'}
        </span>
      ),
    },
    {
      accessorKey: 'openingBalance',
      header: 'Opening Balance',
      cell: ({ row }) => {
        const bal = Number(row.original.openingBalance);
        if (bal === 0 || row.original.isGroup) return <span className="text-slate-400">—</span>;
        return (
          <span className={`font-mono text-sm ${bal >= 0 ? 'text-green-700' : 'text-red-700'}`}>
            ₹ {Math.abs(bal).toLocaleString('en-IN', { minimumFractionDigits: 2 })}
            {bal < 0 ? ' (Cr)' : ' (Dr)'}
          </span>
        );
      },
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
    { name: 'code', label: 'Account Code', type: 'text', required: true },
    { name: 'name', label: 'Account Name', type: 'text', required: true },
    { name: 'alias', label: 'Alias', type: 'text', required: false },
    {
      name: 'accountType',
      label: 'Account Type',
      type: 'select',
      options: ACCOUNT_TYPES,
      required: true,
    },
    {
      name: 'parentId',
      label: 'Parent Account',
      type: 'select',
      options: parentAccounts,
      required: false,
    },
    {
      name: 'isGroup',
      label: 'Is Group Account',
      type: 'select',
      options: [
        { value: 'false', label: 'No (Ledger Account)' },
        { value: 'true', label: 'Yes (Group Account)' },
      ],
      required: true,
    },
    {
      name: 'subledgerType',
      label: 'Subledger Type',
      type: 'select',
      options: SUBLEDGER_TYPES,
      required: false,
    },
    { name: 'openingBalance', label: 'Opening Balance', type: 'text', required: false },
    {
      name: 'currencyCode',
      label: 'Currency',
      type: 'select',
      options: [
        { value: 'INR', label: 'INR - Indian Rupee' },
        { value: 'USD', label: 'USD - US Dollar' },
        { value: 'EUR', label: 'EUR - Euro' },
        { value: 'AED', label: 'AED - UAE Dirham' },
        { value: 'QAR', label: 'QAR - Qatari Riyal' },
      ],
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
      title="Chart of Accounts"
      description="Manage your account hierarchy — Assets, Liabilities, Income, Expenses"
      columns={columns}
      data={accounts}
      isLoading={loading}
      onCreate={handleCreate}
      onUpdate={handleUpdate}
      onRemove={handleDelete}
      formFields={formFields}
    />
  );
};

export default AccountMaster;
