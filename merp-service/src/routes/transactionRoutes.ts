import { Router } from 'express';
import { prisma } from '../index';
import { TransactionOrchestrator } from '../services/transactionService';

const router = Router();

/**
 * GET /api/txn/vouchers
 * Get list of vouchers with pagination and filters
 */
router.get('/vouchers', async (req, res) => {
  try {
    const limit = req.query.limit ? parseInt(req.query.limit as string) : 50;
    const offset = req.query.offset ? parseInt(req.query.offset as string) : 0;
    const companyId = req.query.companyId ? parseInt(req.query.companyId as string) : undefined;
    const voucherType = req.query.voucherType as string | undefined;
    const status = req.query.status as string | undefined;

    const where: any = {};
    if (companyId) where.companyId = companyId;
    if (voucherType) where.voucherType = voucherType;
    if (status) where.status = status;

    const [vouchers, total] = await Promise.all([
      prisma.txnVoucherHeader.findMany({
        where,
        take: limit,
        skip: offset,
        include: {
          items: true
        },
        orderBy: { createdAt: 'desc' }
      }),
      prisma.txnVoucherHeader.count({ where })
    ]);

    res.json({
      success: true,
      data: vouchers,
      total,
      limit,
      offset
    });
  } catch (error: any) {
    console.error("Error fetching vouchers:", error.message);
    res.status(500).json({ 
      success: false,
      error: error.message || 'Internal Server Error' 
    });
  }
});

// /api/txn/process
router.post('/process', async (req, res) => {
  try {
    const { voucherData, action, userId, companyId } = req.body;
    
    // Pass raw API payload cleanly to the transaction orchestrator
    const result = await TransactionOrchestrator.processVoucher(
      voucherData, 
      action, 
      userId, 
      companyId
    );
    
    res.json(result);
  } catch (error: any) {
    console.error("Engine Error:", error.message);
    res.status(500).json({ error: error.message || 'Internal Server Error' });
  }
});

export default router;
