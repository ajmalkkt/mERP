import React, { useState } from 'react';
import {
  useReactTable,
  getCoreRowModel,
  getFilteredRowModel,
  getPaginationRowModel,
  getSortedRowModel,
  flexRender,
  type ColumnDef,
} from '@tanstack/react-table';
import { DynamicForm } from './DynamicForm';
import type { MetaFieldDef } from './DynamicForm';

interface ErpMasterScreenProps {
  entityName: string; // The Tag Engine translated name e.g., 'Stock Location'
  fields: MetaFieldDef[];
  onSave: (data: Record<string, any>) => void;
  listData: Record<string, any>[];
}

export function ErpMasterScreen({ entityName, fields, onSave, listData }: ErpMasterScreenProps) {
  const [formData, setFormData] = useState<Record<string, any>>({});
  const [isEditing, setIsEditing] = useState(false);
  const [globalFilter, setGlobalFilter] = useState('');

  // Create columns from metadata fields
  const columns: ColumnDef<Record<string, any>>[] = fields.map(field => ({
    accessorKey: field.fieldName,
    header: field.label,
    cell: ({ getValue }) => {
      const value = getValue();
      if (field.uiControl === 'dropdown' && field.options) {
        const option = field.options.find(opt => opt.value === value);
        return option ? option.label : value;
      }
      return value;
    },
  }));

  // Add actions column
  columns.push({
    id: 'actions',
    header: 'Actions',
    cell: ({ row }) => (
      <button
        onClick={() => handleSelectRow(row.original)}
        className="text-merp-primary hover:text-blue-700 font-medium text-sm"
      >
        Edit
      </button>
    ),
  });

  const table = useReactTable({
    data: listData,
    columns,
    getCoreRowModel: getCoreRowModel(),
    getFilteredRowModel: getFilteredRowModel(),
    getPaginationRowModel: getPaginationRowModel(),
    getSortedRowModel: getSortedRowModel(),
    globalFilterFn: 'includesString',
    state: {
      globalFilter,
    },
    onGlobalFilterChange: setGlobalFilter,
  });

  const handleCreateNew = () => {
    setFormData({});
    setIsEditing(true);
  };

  const handleSelectRow = (row: Record<string, any>) => {
    setFormData(row);
    setIsEditing(true);
  };

  const handleFormChange = (fieldName: string, value: any) => {
    setFormData(prev => ({ ...prev, [fieldName]: value }));
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSave(formData);
    setIsEditing(false);
  };

  return (
    <div className="flex h-full font-sans text-merp-secondary">
      {/* Search Grid / List Panel */}
      <div className="w-2/3 border-r border-slate-200 bg-white flex flex-col shadow-sm z-10">
        <div className="p-6 border-b border-slate-200 flex justify-between items-center bg-slate-50">
          <h2 className="font-bold text-xl text-slate-800">{entityName} List</h2>
          <button
            onClick={handleCreateNew}
            className="bg-merp-primary hover:bg-blue-700 text-white px-4 py-2 rounded-lg text-sm font-medium transition-colors flex items-center gap-2"
          >
            <span>+</span> Create New
          </button>
        </div>

        {/* Search Bar */}
        <div className="p-4 border-b border-slate-200">
          <input
            type="text"
            placeholder="Search..."
            value={globalFilter}
            onChange={(e) => setGlobalFilter(e.target.value)}
            className="w-full px-3 py-2 border border-slate-300 rounded-md focus:outline-none focus:ring-2 focus:ring-merp-primary/20"
          />
        </div>

        {/* Data Table */}
        <div className="flex-1 overflow-auto">
          <table className="w-full">
            <thead className="bg-slate-50 border-b border-slate-200">
              {table.getHeaderGroups().map(headerGroup => (
                <tr key={headerGroup.id}>
                  {headerGroup.headers.map(header => (
                    <th
                      key={header.id}
                      className="px-4 py-3 text-left text-sm font-semibold text-slate-600 cursor-pointer hover:bg-slate-100"
                      onClick={header.column.getToggleSortingHandler()}
                    >
                      {flexRender(header.column.columnDef.header, header.getContext())}
                      {{
                        asc: ' ↑',
                        desc: ' ↓',
                      }[header.column.getIsSorted() as string] ?? null}
                    </th>
                  ))}
                </tr>
              ))}
            </thead>
            <tbody>
              {table.getRowModel().rows.map(row => (
                <tr key={row.id} className="border-b border-slate-100 hover:bg-slate-50">
                  {row.getVisibleCells().map(cell => (
                    <td key={cell.id} className="px-4 py-3 text-sm text-slate-700">
                      {flexRender(cell.column.columnDef.cell, cell.getContext())}
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>

          {listData.length === 0 && (
            <div className="p-8 text-center text-slate-500">
              No {entityName.toLowerCase()} found. Create your first one!
            </div>
          )}
        </div>

        {/* Pagination */}
        <div className="p-4 border-t border-slate-200 flex items-center justify-between">
          <div className="text-sm text-slate-600">
            Showing {table.getState().pagination.pageIndex * table.getState().pagination.pageSize + 1} to{' '}
            {Math.min(
              (table.getState().pagination.pageIndex + 1) * table.getState().pagination.pageSize,
              listData.length
            )} of {listData.length} entries
          </div>
          <div className="flex gap-2">
            <button
              onClick={() => table.previousPage()}
              disabled={!table.getCanPreviousPage()}
              className="px-3 py-1 border border-slate-300 rounded text-sm disabled:opacity-50"
            >
              Previous
            </button>
            <button
              onClick={() => table.nextPage()}
              disabled={!table.getCanNextPage()}
              className="px-3 py-1 border border-slate-300 rounded text-sm disabled:opacity-50"
            >
              Next
            </button>
          </div>
        </div>
      </div>

      {/* Form Panel */}
      <div className="w-1/3 bg-white flex flex-col shadow-sm">
        <div className="p-6 border-b border-slate-200">
          <h3 className="font-bold text-lg text-slate-800">
            {isEditing ? (formData.id ? 'Edit' : 'Create') : 'Select'} {entityName}
          </h3>
        </div>

        <div className="flex-1 overflow-auto p-6">
          {isEditing ? (
            <form onSubmit={handleSubmit} className="space-y-4">
              <DynamicForm
                fields={fields}
                formData={formData}
                onChange={handleFormChange}
              />
              <div className="flex gap-3 pt-4">
                <button
                  type="submit"
                  className="flex-1 bg-merp-primary hover:bg-blue-700 text-white px-4 py-2 rounded-lg font-medium transition-colors"
                >
                  Save
                </button>
                <button
                  type="button"
                  onClick={() => setIsEditing(false)}
                  className="flex-1 border border-slate-300 text-slate-700 px-4 py-2 rounded-lg font-medium hover:bg-slate-50 transition-colors"
                >
                  Cancel
                </button>
              </div>
            </form>
          ) : (
            <div className="text-center text-slate-500 mt-12">
              <div className="text-4xl mb-4">📋</div>
              <p>Select a record to edit or create a new one</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
