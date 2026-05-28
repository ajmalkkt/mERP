import { Router } from 'express';
import { TransactionOrchestrator } from '../services/transactionService';

const router = Router();

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
