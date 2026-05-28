import { useState, useCallback } from 'react';
import {
  flexRender,
  getCoreRowModel,
  getFilteredRowModel,
  getPaginationRowModel,
  getSortedRowModel,
  useReactTable,
} from '@tanstack/react-table';
import type { ColumnDef, SortingState } from '@tanstack/react-table';
import { ChevronLeft, ChevronRight, Plus, MoreHorizontal, X } from 'lucide-react';
import { DynamicForm, type FormFieldDef } from './DynamicForm';
import { Input } from '../shared/components/ui/input';
import { Button } from '../shared/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '../shared/components/ui/dropdown-menu';

interface GenericMasterScreenProps<T> {
  title: string;
  description?: string;
  columns: ColumnDef<T>[];
  data: T[];
  isLoading?: boolean;
  onCreate?: (data: any) => Promise<void>;
  onUpdate?: (id: string, data: any) => Promise<void>;
  onRemove?: (id: string) => Promise<void>;
  formFields?: FormFieldDef[];
}

/**
 * Generic Master Screen Component
 * Provides grid + form pattern for all master entities.
 * Uses DynamicForm in 'submit' mode for the form modal.
 */
export function GenericMasterScreen<T extends { id: string }>({
  title,
  description,
  columns,
  data,
  isLoading = false,
  onCreate,
  onUpdate,
  onRemove,
  formFields = [],
}: GenericMasterScreenProps<T>) {
  const [sorting, setSorting] = useState<SortingState>([]);
  const [globalFilter, setGlobalFilter] = useState('');
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [selectedRecord, setSelectedRecord] = useState<T | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const table = useReactTable({
    data,
    columns,
    getCoreRowModel: getCoreRowModel(),
    getSortedRowModel: getSortedRowModel(),
    getFilteredRowModel: getFilteredRowModel(),
    getPaginationRowModel: getPaginationRowModel(),
    state: {
      sorting,
      globalFilter,
    },
    onSortingChange: setSorting,
    onGlobalFilterChange: setGlobalFilter,
  });

  const handleAddNew = useCallback(() => {
    setSelectedRecord(null);
    setIsFormOpen(true);
  }, []);

  const handleEditRecord = useCallback((record: T) => {
    setSelectedRecord(record);
    setIsFormOpen(true);
  }, []);

  const handleFormSubmit = async (formData: any) => {
    try {
      setIsSubmitting(true);

      if (selectedRecord) {
        if (onUpdate) {
          await onUpdate(selectedRecord.id, formData);
        }
      } else {
        if (onCreate) {
          await onCreate(formData);
        }
      }

      setIsFormOpen(false);
      setSelectedRecord(null);
    } catch (error) {
      console.error('Form submission error:', error);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDeleteRecord = async (record: T) => {
    if (window.confirm('Are you sure you want to delete this record?')) {
      try {
        if (onRemove) {
          await onRemove(record.id);
        }
      } catch (error) {
        console.error('Delete error:', error);
      }
    }
  };

  const handleCloseForm = () => {
    setIsFormOpen(false);
    setSelectedRecord(null);
  };

  return (
    <div className="flex flex-col h-full p-6">
      {/* Header */}
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-slate-900">{title}</h1>
        {description && <p className="text-slate-500 mt-1 text-sm">{description}</p>}
      </div>

      {/* Toolbar */}
      <div className="flex items-center justify-between mb-4 gap-2">
        <Input
          placeholder="Search..."
          value={globalFilter}
          onChange={(e) => setGlobalFilter(e.target.value)}
          className="max-w-sm"
        />
        <Button onClick={handleAddNew} className="gap-2">
          <Plus size={18} />
          Add New
        </Button>
      </div>

      {/* Table */}
      <div className="flex-1 overflow-auto border border-slate-200 rounded-lg bg-white shadow-sm">
        <table className="w-full border-collapse">
          <thead className="bg-slate-50 border-b border-slate-200 sticky top-0 z-10">
            {table.getHeaderGroups().map((headerGroup) => (
              <tr key={headerGroup.id}>
                {headerGroup.headers.map((header) => (
                  <th
                    key={header.id}
                    className="px-4 py-3 text-left text-xs font-semibold text-slate-600 uppercase tracking-wider cursor-pointer hover:bg-slate-100 transition-colors"
                    onClick={header.column.getToggleSortingHandler()}
                  >
                    <div className="flex items-center gap-1.5">
                      {flexRender(header.column.columnDef.header, header.getContext())}
                      {header.column.getIsSorted() && (
                        <span className="text-blue-600 text-xs">
                          {header.column.getIsSorted() === 'asc' ? '↑' : '↓'}
                        </span>
                      )}
                    </div>
                  </th>
                ))}
                <th className="px-4 py-3 text-center text-xs font-semibold text-slate-600 uppercase tracking-wider w-16">
                  Actions
                </th>
              </tr>
            ))}
          </thead>
          <tbody className="divide-y divide-slate-100">
            {isLoading ? (
              <tr>
                <td colSpan={columns.length + 1} className="px-4 py-12 text-center text-slate-400">
                  <div className="flex flex-col items-center gap-2">
                    <svg className="animate-spin h-6 w-6 text-blue-500" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                    </svg>
                    Loading...
                  </div>
                </td>
              </tr>
            ) : table.getRowModel().rows.length === 0 ? (
              <tr>
                <td colSpan={columns.length + 1} className="px-4 py-12 text-center text-slate-400">
                  <div className="flex flex-col items-center gap-2">
                    <span className="text-3xl">📋</span>
                    No records found
                  </div>
                </td>
              </tr>
            ) : (
              table.getRowModel().rows.map((row) => (
                <tr key={row.id} className="hover:bg-blue-50/40 transition-colors">
                  {row.getVisibleCells().map((cell) => (
                    <td key={cell.id} className="px-4 py-3 text-sm text-slate-700">
                      {flexRender(cell.column.columnDef.cell, cell.getContext())}
                    </td>
                  ))}
                  <td className="px-4 py-3 text-center">
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="ghost" size="sm">
                          <MoreHorizontal size={16} />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <DropdownMenuItem onClick={() => handleEditRecord(row.original)}>
                          Edit
                        </DropdownMenuItem>
                        <DropdownMenuItem
                          onClick={() => handleDeleteRecord(row.original)}
                          className="text-red-600"
                        >
                          Delete
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {/* Pagination */}
      <div className="flex items-center justify-between mt-4">
        <div className="text-sm text-slate-500">
          {data.length > 0 ? (
            <>
              Showing{' '}
              {table.getState().pagination.pageIndex * table.getState().pagination.pageSize + 1} to{' '}
              {Math.min(
                (table.getState().pagination.pageIndex + 1) * table.getState().pagination.pageSize,
                data.length
              )}{' '}
              of {data.length}
            </>
          ) : (
            'No records'
          )}
        </div>
        <div className="flex gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => table.previousPage()}
            disabled={!table.getCanPreviousPage()}
          >
            <ChevronLeft size={16} />
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={() => table.nextPage()}
            disabled={!table.getCanNextPage()}
          >
            <ChevronRight size={16} />
          </Button>
        </div>
      </div>

      {/* Form Modal */}
      {isFormOpen && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 animate-in fade-in">
          <div className="bg-white rounded-xl shadow-2xl max-w-md w-full mx-4 max-h-[85vh] overflow-hidden flex flex-col">
            {/* Modal Header */}
            <div className="bg-gradient-to-r from-blue-600 to-blue-700 px-6 py-4 flex justify-between items-center shrink-0">
              <h2 className="text-lg font-semibold text-white">
                {selectedRecord ? 'Edit' : 'Create New'} Record
              </h2>
              <button
                onClick={handleCloseForm}
                className="text-white/80 hover:text-white transition-colors rounded-full p-1 hover:bg-white/10"
              >
                <X size={20} />
              </button>
            </div>

            {/* Modal Body */}
            <div className="p-6 overflow-y-auto flex-1">
              <DynamicForm
                mode="submit"
                fields={formFields}
                initialValues={selectedRecord || {}}
                onSubmit={handleFormSubmit}
                isLoading={isSubmitting}
                submitLabel={selectedRecord ? 'Update' : 'Create'}
              />
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default GenericMasterScreen;
