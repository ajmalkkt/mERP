import { useState, useEffect } from 'react';
import axios from 'axios';
import {
  useReactTable,
  getCoreRowModel,
  flexRender,
  type ColumnDef,
} from '@tanstack/react-table';
import { DynamicForm } from './DynamicForm';
import { WorkflowApprovalPanel } from './WorkflowApprovalPanel';
import type { MetaFieldDef } from './DynamicForm';

export function VoucherScreen() {
  const [voucherType] = useState('SALES_INVOICE');
  const [schema, setSchema] = useState<any>(null);
  const [headerData, setHeaderData] = useState<any>({
    voucherDate: new Date().toISOString().split('T')[0],
    companyId: 1,
    branchId: 1,
  });
  const [customFields, setCustomFields] = useState<any>({});
  const [lines, setLines] = useState<any[]>([{ productId: 1, qty: 10, rate: 120, amount: 1200 }]);

  // Fetch the voucher layout definition from Metadata Engine
  useEffect(() => {
    axios.get(`http://localhost:5000/api/meta/voucher/${voucherType}`)
      .then(res => {
        setSchema(res.data);
      })
      .catch(err => console.error("Failed to load schema", err));
  }, [voucherType]);

  const handleCustomFieldChange = (field: string, val: any) => {
    setCustomFields((prev: any) => ({ ...prev, [field]: val }));
  };

  const handleHeaderChange = (e: any) => {
    setHeaderData({ ...headerData, [e.target.name]: e.target.value });
  };

  const calculateTotal = () => {
    return lines.reduce((acc, line) => acc + (line.qty * line.rate), 0);
  };

  const submitVoucher = async () => {
    try {
      const payload = {
        voucherData: {
          ...headerData,
          voucherType,
          totalAmount: calculateTotal(),
          customFields,
          lines: lines.map(l => ({ ...l, amount: l.qty * l.rate }))
        },
        action: 'SUBMIT',
        userId: 1,
        companyId: headerData.companyId
      };

      const res = await axios.post('http://localhost:5000/api/txn/process', payload);
      alert(`✅ Success: Voucher ${res.data.voucherNo} posted successfully! Ledgers and Stock Movement applied.`);

      // Reset after success
      setCustomFields({});
      setLines([{ productId: 1, qty: 10, rate: 120, amount: 1200 }]);
    } catch (e: any) {
      alert(`❌ Error: ${e.response?.data?.error || e.message}`);
    }
  };

  // Convert pure DB schema into frontend MetaField definitions
  const metaFields: MetaFieldDef[] = schema?.fields?.map((f: any) => {
    // We would typically consult the TagEngine here to localize fieldName to display labels
    const label = f.metaField.fieldName.replace('_', ' ').replace(/\b\w/g, (c: string) => c.toUpperCase());
    return {
      fieldName: f.metaField.fieldName,
      label: label,
      uiControl: f.metaField.uiControl,
      dataType: f.metaField.dataType,
      required: f.metaField.required
    };
  }) || [];

  // Define columns for line items table
  const columns: ColumnDef<any>[] = [
    {
      accessorKey: 'productId',
      header: 'Product ID',
      cell: ({ row, getValue }) => (
        <input
          type="number"
          value={getValue() as number}
          onChange={(e) => {
            const newLines = [...lines];
            newLines[row.index].productId = Number(e.target.value);
            setLines(newLines);
          }}
          className="border border-slate-200 px-3 py-1.5 rounded w-full outline-none focus:border-merp-primary focus:ring-1 focus:ring-merp-primary shadow-inner bg-slate-50 focus:bg-white"
        />
      ),
    },
    {
      accessorKey: 'qty',
      header: 'Quantity',
      cell: ({ row, getValue }) => (
        <input
          type="number"
          value={getValue() as number}
          onChange={(e) => {
            const newLines = [...lines];
            newLines[row.index].qty = Number(e.target.value);
            setLines(newLines);
          }}
          className="border border-slate-200 px-3 py-1.5 rounded w-full outline-none focus:border-merp-primary focus:ring-1 focus:ring-merp-primary shadow-inner bg-slate-50 focus:bg-white"
        />
      ),
    },
    {
      accessorKey: 'rate',
      header: 'Rate',
      cell: ({ row, getValue }) => (
        <input
          type="number"
          value={getValue() as number}
          onChange={(e) => {
            const newLines = [...lines];
            newLines[row.index].rate = Number(e.target.value);
            setLines(newLines);
          }}
          className="border border-slate-200 px-3 py-1.5 rounded w-full outline-none focus:border-merp-primary focus:ring-1 focus:ring-merp-primary shadow-inner bg-slate-50 focus:bg-white"
        />
      ),
    },
    {
      id: 'lineTotal',
      header: 'Line Total',
      cell: ({ row }) => (
        <div className="font-bold text-slate-700 text-right">
          ${(row.original.qty * row.original.rate).toFixed(2)}
        </div>
      ),
    },
    {
      id: 'actions',
      header: 'Actions',
      cell: ({ row }) => (
        <button
          onClick={() => {
            const newLines = lines.filter((_, idx) => idx !== row.index);
            setLines(newLines.length > 0 ? newLines : [{ productId: 1, qty: 1, rate: 0, amount: 0 }]);
          }}
          className="text-red-500 hover:text-red-700 font-medium text-sm"
        >
          Remove
        </button>
      ),
    },
  ];

  const table = useReactTable({
    data: lines,
    columns,
    getCoreRowModel: getCoreRowModel(),
  });

  return (
    <div className="p-8 max-w-5xl mx-auto font-sans text-merp-secondary">
      <div className="flex justify-between items-center mb-6">
        <div>
          <h1 className="text-3xl font-extrabold tracking-tight text-slate-800">New {voucherType.replace('_', ' ')}</h1>
          <p className="text-slate-500 mt-1">Transaction UI connected dynamically to the Metadata Engine.</p>
        </div>
        <button onClick={submitVoucher} className="bg-merp-primary text-white px-6 py-2.5 rounded-lg font-bold shadow-md shadow-blue-500/30 hover:bg-blue-700 transition-colors">
          Post Transaction
        </button>
      </div>

      {/* Standard Core Header Fields */}
      <div className="bg-white p-6 rounded-xl shadow-sm border border-slate-200 mb-6 flex gap-8">
        <div>
          <label className="block text-xs font-bold uppercase tracking-wider text-slate-500 mb-2">Voucher Date</label>
          <input type="date" name="voucherDate" value={headerData.voucherDate} onChange={handleHeaderChange} className="border border-slate-300 px-3 py-2 rounded-md shadow-sm bg-slate-50 focus:bg-white focus:ring-2 focus:ring-merp-primary outline-none" />
        </div>
        <div>
          <label className="block text-xs font-bold uppercase tracking-wider text-slate-500 mb-2">Company ID</label>
          <input type="number" name="companyId" value={headerData.companyId} onChange={handleHeaderChange} className="border border-slate-300 px-3 py-2 rounded-md shadow-sm w-24 bg-slate-50 focus:bg-white focus:ring-2 focus:ring-merp-primary outline-none" />
        </div>
        <div>
          <label className="block text-xs font-bold uppercase tracking-wider text-slate-500 mb-2">Branch ID</label>
          <input type="number" name="branchId" value={headerData.branchId} onChange={handleHeaderChange} className="border border-slate-300 px-3 py-2 rounded-md shadow-sm w-24 bg-slate-50 focus:bg-white focus:ring-2 focus:ring-merp-primary outline-none" />
        </div>
      </div>

      {/* Dynamic Header Fields (From U00x Config Replacement) */}
      {metaFields.length > 0 && (
        <div className="bg-white p-6 rounded-xl shadow-sm border border-slate-200 border-l-4 border-l-amber-400 mb-6">
          <div className="mb-4 flex items-center gap-2">
             <span className="text-amber-500 font-bold tracking-wider uppercase text-xs">Dynamic Extensions</span>
             <h2 className="text-lg font-bold text-slate-800">Custom Attributes</h2>
          </div>
          <DynamicForm fields={metaFields} formData={customFields} onChange={handleCustomFieldChange} />
        </div>
      )}

      {/* Workflow Approval Panel */}
      <div className="mb-6">
        <WorkflowApprovalPanel
          entityType="VOUCHER"
          entityId={1} // In production, this would be the actual voucher ID after creation
          userId={1}  // In production, this would come from auth context
          disabled={false}
        />
      </div>

      {/* Transaction Line Items */}
      <div className="bg-white p-6 rounded-xl shadow-sm border border-slate-200 mb-6 relative overflow-hidden">
        <div className="absolute top-0 left-0 w-full h-1 bg-merp-primary"></div>
        <div className="flex justify-between items-center mb-4">
          <h2 className="text-lg font-bold text-slate-800">Line Items</h2>
          <button
            onClick={() => setLines([...lines, { productId: 1, qty: 1, rate: 0, amount: 0 }])}
            className="text-merp-primary font-bold hover:underline text-sm"
          >
            + Add New Line
          </button>
        </div>
        <div className="border rounded-md overflow-hidden">
          <table className="w-full text-left">
            <thead>
              <tr className="bg-slate-100 text-slate-600 text-xs uppercase tracking-wider font-bold">
                {table.getHeaderGroups().map(headerGroup =>
                  headerGroup.headers.map(header => (
                    <th key={header.id} className="p-3">
                      {flexRender(header.column.columnDef.header, header.getContext())}
                    </th>
                  ))
                )}
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {table.getRowModel().rows.map(row => (
                <tr key={row.id} className="hover:bg-slate-50 transition-colors">
                  {row.getVisibleCells().map(cell => (
                    <td key={cell.id} className="p-3">
                      {flexRender(cell.column.columnDef.cell, cell.getContext())}
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <div className="mt-4 flex justify-between items-center bg-slate-50 p-4 rounded-lg border border-slate-100">
          <div className="text-slate-500 font-medium uppercase text-xs tracking-wider">Grand Total</div>
          <div className="text-3xl font-black text-slate-800">${calculateTotal().toFixed(2)}</div>
        </div>
      </div>
    </div>
  );
}
