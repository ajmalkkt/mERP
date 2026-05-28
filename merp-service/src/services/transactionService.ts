import { prisma } from '../index';
import { WorkflowEngine } from './workflowService';
import { NumberSequenceService } from './numberSequenceService';

export class TransactionOrchestrator {
  /**
   * Main entry point to process any voucher through the system.
   * This handles the core Transaction Engine Orchestrator logic.
   */
  static async processVoucher(voucherData: any, action: string, userId: number, companyId: number) {
    // We execute everything inside an ACID $transaction
    return await prisma.$transaction(async (trx) => {
      
      // 1. Get Metadata (Config) for this voucher type
      const config = await trx.metaVoucherDefinition.findUnique({
        where: { voucherType: voucherData.voucherType }
      });
      
      if (!config) {
        throw new Error(`Voucher mapping not found for type: ${voucherData.voucherType}`);
      }

      // 2. Validate Period Open (skip implementation detail for brevity)
      // await validatePeriodOpen(voucherData.voucherDate, companyId, trx);

      // 3. Generate Voucher Number Sequence
      const voucherNo = await NumberSequenceService.generateNumber(
        companyId,
        voucherData.branchId,
        voucherData.voucherType
      );

      // Setup assumed final status based on whether workflow exists
      // The Workflow Engine intercepts and may push it back to DRAFT/PENDING
      let activeStatus = 'POSTED';

      // 4. Save Voucher Header & Dynamic JSON Payload
      const header = await trx.txnVoucherHeader.create({
        data: {
          voucherType: voucherData.voucherType,
          voucherNo,
          companyId,
          branchId: voucherData.branchId,
          voucherDate: new Date(voucherData.voucherDate),
          status: 'DRAFT', // Will update immediately downstream
          totalAmount: voucherData.totalAmount,
          jsonPayload: voucherData.customFields || {}, // Freeform metadata extensions
        }
      });

      // 8. Auto-initialize Workflow Engine hooks directly inside transaction!
      const workflowInstance = await WorkflowEngine.initializeWorkflow(
        trx,
        header.id,
        'txn_voucher_header',
        voucherData.voucherType,
        userId
      );

      if (workflowInstance) {
         // Override to Draft since it needs approval
         activeStatus = 'DRAFT';
         await trx.txnVoucherHeader.update({
            where: { id: header.id },
            data: { status: 'DRAFT' }
         });
      } else {
         // Auto approve
         await trx.txnVoucherHeader.update({
            where: { id: header.id },
            data: { status: 'POSTED' }
         });
      }

      // 5. Save Line Items
      if (voucherData.lines && voucherData.lines.length > 0) {
        const linesData = voucherData.lines.map((line: any) => ({
          voucherId: header.id,
          productId: line.productId,
          qty: line.qty,
          rate: line.rate,
          amount: line.amount,
          batchId: line.batchId,
          serialId: line.serialId
        }));
        await trx.txnVoucherItem.createMany({ data: linesData });
      }

      // 6. Generate Ledger Entries (Financial Engine)
      // Usually derived dynamically via mapping, simplified logic here:
      if (activeStatus === 'POSTED') {
        // e.g., Debit Customer, Credit Sales
        await trx.accLedgerEntry.createMany({
          data: [
            {
              voucherId: header.id,
              accountId: voucherData.customerAccountId || 1, // mock
              debit: header.totalAmount,
              credit: 0,
              postingDate: header.voucherDate
            },
            {
              voucherId: header.id,
              accountId: voucherData.salesAccountId || 2, // mock
              debit: 0,
              credit: header.totalAmount,
              postingDate: header.voucherDate
            }
          ]
        });

        // 7. Generate Stock Movements (Inventory Engine)
        if (voucherData.lines && voucherData.lines.length > 0) {
          const stockMovements = voucherData.lines.map((line: any) => ({
            voucherRef: header.id,
            productId: line.productId,
            warehouseId: voucherData.warehouseId || 1, // mock
            qtyIn: action === 'RECEIPT' ? line.qty : 0,
            qtyOut: action === 'ISSUE' || action === 'SALE' ? line.qty : 0,
            batchId: line.batchId,
            serialId: line.serialId
          }));
          await trx.invStockLedger.createMany({ data: stockMovements });
        }
      }

      // 8. Workflow/Audit Engine interactions would go here

      return { success: true, data: header, voucherNo };
    });
  }
}
