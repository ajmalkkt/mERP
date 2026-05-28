import React, { useMemo, useCallback, useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useForm, Controller } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import {
    useReactTable,
    getCoreRowModel,
    getSortedRowModel,
    getFilteredRowModel,
    getPaginationRowModel,
    getGroupedRowModel,
    flexRender,
    type ColumnDef,
    type SortingState,
    type ColumnFiltersState,
    type GroupingState,
    type VisibilityState,
} from '@tanstack/react-table';

// ─── ShadCN UI Components ──────────────────────────────────────────────────
import { Button } from '@/shared/components/ui/button';
import { Input } from '@/shared/components/ui/input';
import { Sheet, SheetContent, SheetHeader, SheetTitle } from '@/shared/components/ui/sheet';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/shared/components/ui/tabs';
import { Badge } from '@/shared/components/ui/badge';
import {
    AlertDialog,
    AlertDialogAction,
    AlertDialogCancel,
    AlertDialogContent,
    AlertDialogDescription,
    AlertDialogHeader,
    AlertDialogTitle,
} from '@/shared/components/ui/alert-dialog';

// ─── ERP Core ───────────────────────────────────────────────────────────────
import { DynamicField } from '@/erp-core/forms/DynamicField';
import { useFieldConfig } from '@/erp-core/metadata/useFieldConfig';
import { useTag } from '@/erp-core/metadata/useTag';
import { useGridLayout } from '@/erp-core/grid/useGridLayout';
import { buildColumns } from '@/erp-core/grid/gridColumns';
import { useFormSchema } from '@/erp-core/forms/useFormSchema';
import { createCrudService } from '@/erp-core/services/crudService';
import { toast } from '@/shared/components/ui/sonner';

// ─── Types ──────────────────────────────────────────────────────────────────
import type { FieldMeta, PagedResponse } from '@/erp-core/services/types';

// ─── Constants ──────────────────────────────────────────────────────────────
const DEFAULT_PAGE_SIZE = 25;

// ═══════════════════════════════════════════════════════════════════════════════
// MasterScreen — Generic master screen template
//
// Usage:
//   <MasterScreen
//     entityName="item"
//     entityLabel="Item"
//     entityEndpoint="/api/masters/item"
//     companyId={companyId}
//     branchId={branchId}
//     userRole="admin"
//   />
// ═══════════════════════════════════════════════════════════════════════════════

interface MasterScreenProps {
    entityName: string;
    entityLabel?: string;
    entityEndpoint: string;
    companyId: string;
    branchId?: string;
    userRole: 'admin' | 'manager' | 'user' | 'viewer';
}

export default function MasterScreen({
    entityName,
    entityLabel,
    entityEndpoint,
    companyId,
    branchId,
    userRole,
}: MasterScreenProps) {
    const queryClient = useQueryClient();
    const label = useTag(entityName) ?? entityLabel ?? entityName;

    // ── State ──────────────────────────────────────────────────────────────────
    const [formMode, setFormMode] = useState<'create' | 'edit' | 'view' | null>(null);
    const [selectedRow, setSelectedRow] = useState<Record<string, unknown> | null>(null);
    const [confirmDelete, setConfirmDelete] = useState<Record<string, unknown> | null>(null);
    const [globalFilter, setGlobalFilter] = useState('');
    const [showAdminConfig, setShowAdminConfig] = useState(false);

    // TanStack Table state
    const [sorting, setSorting] = useState<SortingState>([]);
    const [columnFilters, setColumnFilters] = useState<ColumnFiltersState>([]);
    const [columnVisibility, setColumnVisibility] = useState<VisibilityState>({});
    const [grouping, setGrouping] = useState<GroupingState>([]);
    const [pagination, setPagination] = useState({ pageIndex: 0, pageSize: DEFAULT_PAGE_SIZE });

    // ── Field metadata ────────────────────────────────────────────────────────
    const { data: fieldConfig = [] } = useFieldConfig(entityName, companyId);

    // ── Saved grid layout ─────────────────────────────────────────────────────
    const { savedLayout, saveLayout } = useGridLayout(entityName);

    // ── Service ───────────────────────────────────────────────────────────────
    const service = useMemo(() => createCrudService(entityEndpoint), [entityEndpoint]);

    // ── Grid data (React Query) ───────────────────────────────────────────────
    const { data: gridData, isLoading, isError, error } = useQuery({
        queryKey: [entityName, pagination, sorting, columnFilters, globalFilter, companyId, branchId],
        queryFn: () =>
            service.list({
                page: pagination.pageIndex + 1,
                pageSize: pagination.pageSize,
                sort: sorting.map(s => `${s.id}:${s.desc ? 'desc' : 'asc'}`).join(','),
                search: globalFilter,
                companyId,
                branchId,
            }),
        placeholderData: (prev) => prev,
    });

    // ── Column definitions (generated from metadata) ─────────────────────────
    const columns = useMemo<ColumnDef<Record<string, unknown>>[]>(() => {
        const dataCols = buildColumns(fieldConfig, useTag);

        // Action column
        const actionCol: ColumnDef<Record<string, unknown>> = {
            id: 'actions',
            header: '',
            size: 100,
            enableSorting: false,
            enableColumnFilter: false,
            cell: ({ row }) => (
                <div className="flex gap-1">
                    <Button variant="ghost" size="icon" onClick={() => handleView(row.original)}>👁</Button>
                    <Button variant="ghost" size="icon" onClick={() => handleEdit(row.original)}>✏️</Button>
                    <Button variant="ghost" size="icon" onClick={() => handleDelete(row.original)}>🗑</Button>
                </div>
            ),
        };

        return [...dataCols, actionCol];
    }, [fieldConfig]);

    // ── TanStack Table instance ───────────────────────────────────────────────
    const table = useReactTable({
        data: gridData?.data ?? [],
        columns,
        state: { sorting, columnFilters, columnVisibility, grouping, globalFilter, pagination },
        onSortingChange: setSorting,
        onColumnFiltersChange: setColumnFilters,
        onColumnVisibilityChange: setColumnVisibility,
        onGroupingChange: setGrouping,
        onGlobalFilterChange: setGlobalFilter,
        onPaginationChange: setPagination,
        getCoreRowModel: getCoreRowModel(),
        getSortedRowModel: getSortedRowModel(),
        getFilteredRowModel: getFilteredRowModel(),
        getPaginationRowModel: getPaginationRowModel(),
        getGroupedRowModel: getGroupedRowModel(),
        manualPagination: true,
        pageCount: gridData?.pagination?.totalPages ?? -1,
        columnResizeMode: 'onChange',
    });

    // ── Mutations ─────────────────────────────────────────────────────────────
    const createMutation = useMutation({
        mutationFn: (data: Record<string, unknown>) =>
            service.create({ ...data, companyId, branchId }),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: [entityName] });
            setFormMode(null);
            toast.success(`${label} created successfully`);
        },
        onError: (err: Error) => toast.error(err.message),
    });

    const updateMutation = useMutation({
        mutationFn: (data: Record<string, unknown>) =>
            service.update(selectedRow?.id as string, data),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: [entityName] });
            setFormMode(null);
            setSelectedRow(null);
            toast.success(`${label} updated successfully`);
        },
        onError: (err: Error) => toast.error(err.message),
    });

    const deleteMutation = useMutation({
        mutationFn: (id: string) => service.remove(id),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: [entityName] });
            setConfirmDelete(null);
            toast.success(`${label} deleted`);
        },
        onError: (err: Error) => toast.error(err.message),
    });

    // ── Handlers ──────────────────────────────────────────────────────────────
    const handleAdd = useCallback(() => { setSelectedRow(null); setFormMode('create'); }, []);
    const handleEdit = useCallback((row: Record<string, unknown>) => { setSelectedRow(row); setFormMode('edit'); }, []);
    const handleView = useCallback((row: Record<string, unknown>) => { setSelectedRow(row); setFormMode('view'); }, []);
    const handleDelete = useCallback((row: Record<string, unknown>) => { setConfirmDelete(row); }, []);

    const handleFormSubmit = useCallback(
        (data: Record<string, unknown>) => {
            if (formMode === 'create') createMutation.mutate(data);
            else if (formMode === 'edit') updateMutation.mutate(data);
        },
        [formMode, createMutation, updateMutation],
    );

    // ── Render ────────────────────────────────────────────────────────────────
    return (
        <div className="flex flex-col h-full">
            {/* ── Toolbar ─────────────────────────────────────────────────────── */}
            <div className="flex items-center gap-3 px-4 py-3 border-b bg-background">
                <h1 className="text-lg font-semibold">{label} Master</h1>

                <Input
                    className="max-w-xs"
                    placeholder={`Search ${label}…`}
                    value={globalFilter}
                    onChange={(e) => setGlobalFilter(e.target.value)}
                />

                <div className="ml-auto flex gap-2">
                    <Button onClick={handleAdd}>+ Add {label}</Button>
                    <Button
                        variant="outline"
                        onClick={() =>
                            window.open(`${entityEndpoint}/export?companyId=${companyId}`, '_blank')
                        }
                    >
                        Export
                    </Button>
                    {userRole === 'admin' && (
                        <Button variant="ghost" size="icon" onClick={() => setShowAdminConfig(v => !v)}>
                            ⚙️
                        </Button>
                    )}
                </div>
            </div>

            {/* ── Active filter chips ─────────────────────────────────────────── */}
            {columnFilters.length > 0 && (
                <div className="flex gap-2 px-4 py-2 bg-muted/50">
                    {columnFilters.map(f => (
                        <Badge key={f.id} variant="secondary" className="cursor-pointer"
                            onClick={() => setColumnFilters(prev => prev.filter(x => x.id !== f.id))}>
                            {f.id}: {String(f.value)} ✕
                        </Badge>
                    ))}
                </div>
            )}

            {/* ── Error banner ────────────────────────────────────────────────── */}
            {isError && (
                <div className="px-4 py-2 bg-destructive/10 text-destructive text-sm">
                    Failed to load data: {(error as Error)?.message}.{' '}
                    <Button variant="link" size="sm"
                        onClick={() => queryClient.invalidateQueries({ queryKey: [entityName] })}>
                        Retry
                    </Button>
                </div>
            )}

            {/* ── TanStack Table Grid ─────────────────────────────────────────── */}
            <div className="flex-1 overflow-auto">
                <table className="w-full text-sm">
                    <thead className="bg-muted sticky top-0">
                        {table.getHeaderGroups().map(hg => (
                            <tr key={hg.id}>
                                {hg.headers.map(header => (
                                    <th
                                        key={header.id}
                                        className="px-3 py-2 text-left font-medium cursor-pointer select-none relative"
                                        style={{ width: header.getSize() }}
                                        onClick={header.column.getToggleSortingHandler()}
                                    >
                                        {flexRender(header.column.columnDef.header, header.getContext())}
                                        {{ asc: ' ↑', desc: ' ↓' }[header.column.getIsSorted() as string] ?? ''}

                                        {/* Column resize handle */}
                                        <div
                                            onMouseDown={header.getResizeHandler()}
                                            onTouchStart={header.getResizeHandler()}
                                            className="absolute right-0 top-0 h-full w-1 cursor-col-resize select-none touch-none
                                 hover:bg-primary/50"
                                        />
                                    </th>
                                ))}
                            </tr>
                        ))}
                    </thead>

                    <tbody>
                        {isLoading ? (
                            <tr><td colSpan={columns.length} className="text-center py-12 text-muted-foreground">Loading…</td></tr>
                        ) : table.getRowModel().rows.length === 0 ? (
                            <tr><td colSpan={columns.length} className="text-center py-12 text-muted-foreground">No records found</td></tr>
                        ) : (
                            table.getRowModel().rows.map(row => (
                                <tr key={row.id} className="border-b hover:bg-muted/50 transition-colors">
                                    {row.getVisibleCells().map(cell => (
                                        <td key={cell.id} className="px-3 py-2" style={{ width: cell.column.getSize() }}>
                                            {flexRender(cell.column.columnDef.cell, cell.getContext())}
                                        </td>
                                    ))}
                                </tr>
                            ))
                        )}
                    </tbody>
                </table>
            </div>

            {/* ── Pagination ──────────────────────────────────────────────────── */}
            <div className="flex items-center justify-between px-4 py-3 border-t bg-background">
                <span className="text-sm text-muted-foreground">
                    {gridData?.pagination?.totalRows ?? 0} total records
                </span>
                <div className="flex items-center gap-2">
                    <Button variant="outline" size="sm" onClick={() => table.previousPage()} disabled={!table.getCanPreviousPage()}>
                        Previous
                    </Button>
                    <span className="text-sm">
                        Page {table.getState().pagination.pageIndex + 1} of {table.getPageCount()}
                    </span>
                    <Button variant="outline" size="sm" onClick={() => table.nextPage()} disabled={!table.getCanNextPage()}>
                        Next
                    </Button>
                </div>
            </div>

            {/* ── Form Drawer (ShadCN Sheet) ──────────────────────────────────── */}
            <Sheet open={formMode !== null} onOpenChange={() => setFormMode(null)}>
                <SheetContent className="w-[520px] sm:max-w-lg overflow-y-auto">
                    <SheetHeader>
                        <SheetTitle>
                            {formMode === 'create' ? `New ${label}` : formMode === 'edit' ? `Edit ${label}` : `View ${label}`}
                        </SheetTitle>
                    </SheetHeader>

                    {formMode && (
                        <MasterForm
                            fieldConfig={fieldConfig}
                            initialValues={formMode === 'create' ? {} : selectedRow ?? {}}
                            readOnly={formMode === 'view'}
                            onSubmit={handleFormSubmit}
                            onCancel={() => setFormMode(null)}
                            submitting={createMutation.isPending || updateMutation.isPending}
                        />
                    )}
                </SheetContent>
            </Sheet>

            {/* ── Delete confirmation (ShadCN AlertDialog) ────────────────────── */}
            <AlertDialog open={confirmDelete !== null} onOpenChange={() => setConfirmDelete(null)}>
                <AlertDialogContent>
                    <AlertDialogHeader>
                        <AlertDialogTitle>Delete {label}?</AlertDialogTitle>
                        <AlertDialogDescription>
                            This record will be soft-deleted and can be restored by an admin.
                        </AlertDialogDescription>
                    </AlertDialogHeader>
                    <div className="flex justify-end gap-2">
                        <AlertDialogCancel>Cancel</AlertDialogCancel>
                        <AlertDialogAction onClick={() => deleteMutation.mutate(confirmDelete?.id as string)}>
                            {deleteMutation.isPending ? 'Deleting…' : 'Delete'}
                        </AlertDialogAction>
                    </div>
                </AlertDialogContent>
            </AlertDialog>
        </div>
    );
}

// ═══════════════════════════════════════════════════════════════════════════════
// MasterForm — Dynamic form driven by field metadata
// ═══════════════════════════════════════════════════════════════════════════════

interface MasterFormProps {
    fieldConfig: FieldMeta[];
    initialValues: Record<string, unknown>;
    readOnly: boolean;
    onSubmit: (data: Record<string, unknown>) => void;
    onCancel: () => void;
    submitting: boolean;
}

function MasterForm({ fieldConfig, initialValues, readOnly, onSubmit, onCancel, submitting }: MasterFormProps) {
    const validationSchema = useFormSchema(fieldConfig);
    const sections = useMemo(() => groupBySection(fieldConfig), [fieldConfig]);

    const { control, handleSubmit, watch, formState: { errors } } = useForm({
        resolver: zodResolver(validationSchema),
        defaultValues: initialValues,
    });

    const formValues = watch();

    return (
        <form className="mt-6 space-y-6" onSubmit={handleSubmit(onSubmit)}>
            <Tabs defaultValue={Object.keys(sections)[0]}>
                <TabsList className="w-full justify-start">
                    {Object.keys(sections).filter(s => !s.startsWith('_')).map(s => (
                        <TabsTrigger key={s} value={s}>{s}</TabsTrigger>
                    ))}
                </TabsList>

                {Object.entries(sections).filter(([s]) => !s.startsWith('_')).map(([sectionName, fields]) => (
                    <TabsContent key={sectionName} value={sectionName}>
                        <div className="grid grid-cols-2 gap-4">
                            {(fields as FieldMeta[]).map(field =>
                                isFieldVisible(field, formValues) && (
                                    <div key={field.fieldName} className={field.type === 'textarea' ? 'col-span-2' : ''}>
                                        <Controller
                                            name={field.fieldName}
                                            control={control}
                                            render={({ field: rhf }) => (
                                                <DynamicField
                                                    field={field}
                                                    value={rhf.value}
                                                    onChange={rhf.onChange}
                                                    error={errors[field.fieldName]?.message as string}
                                                    readOnly={readOnly || field.readOnly}
                                                />
                                            )}
                                        />
                                    </div>
                                ),
                            )}
                        </div>
                    </TabsContent>
                ))}
            </Tabs>

            {/* Audit info */}
            {initialValues?.createdAt && (
                <div className="text-xs text-muted-foreground border-t pt-3 space-y-1">
                    <p>Created: {String(initialValues.createdAt)} by {String(initialValues.createdBy)}</p>
                    <p>Modified: {String(initialValues.modifiedAt)} by {String(initialValues.modifiedBy)}</p>
                </div>
            )}

            {/* Actions */}
            {!readOnly && (
                <div className="flex gap-3 pt-4 border-t">
                    <Button type="submit" disabled={submitting}>
                        {submitting ? 'Saving…' : 'Save'}
                    </Button>
                    <Button type="button" variant="outline" onClick={onCancel}>Cancel</Button>
                </div>
            )}
        </form>
    );
}

// ─── Helpers ─────────────────────────────────────────────────────────────────

function groupBySection(fields: FieldMeta[]): Record<string, FieldMeta[]> {
    const sections: Record<string, FieldMeta[]> = {};
    fields
        .filter(f => f.formVisible !== false)
        .sort((a, b) => a.formOrder - b.formOrder)
        .forEach(f => {
            const section = f.formSection || 'General';
            if (!sections[section]) sections[section] = [];
            sections[section].push(f);
        });
    return sections;
}

function isFieldVisible(field: FieldMeta, formValues: Record<string, unknown>): boolean {
    if (!field.visibilityRule) return true;
    const { dependsOn, operator, value } = field.visibilityRule;
    const actual = formValues[dependsOn];
    switch (operator) {
        case 'eq': return actual === value;
        case 'neq': return actual !== value;
        case 'in': return Array.isArray(value) && value.includes(actual);
        case 'gt': return (actual as number) > (value as number);
        case 'lt': return (actual as number) < (value as number);
        default: return true;
    }
}
