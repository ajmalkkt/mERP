---
name: erp-transaction-engine
description: >
  ERP Transaction Engine — the core that handles voucher posting, stock movement,
  ledger generation, accounting integration, and audit trail. This is the most
  complex and powerful part of the ERP platform.
---

# ERP Transaction Engine — Design & Instructions

## 🎯 Purpose

The Transaction Engine is the **execution core** of the ERP. While the Metadata
Engine defines *what* a voucher looks like, the Transaction Engine defines
*what happens* when a voucher is saved, posted, approved, or reversed.

```
Metadata Engine  →  "What does this voucher contain?"
Transaction Engine →  "What happens when you save it?"
```

---

## 🏗️ Architecture Overview

```
┌─────────────────────────────────────────────────────────────────┐
│                    TRANSACTION ENGINE                             │
│                                                                   │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐           │
│  │ Voucher      │  │ Ledger       │  │ Stock        │           │
│  │ Posting      │  │ Generator    │  │ Movement     │           │
│  │ Engine       │  │              │  │ Engine       │           │
│  └──────┬───────┘  └──────┬───────┘  └──────┬───────┘           │
│         │                 │                  │                    │
│  ┌──────▼─────────────────▼──────────────────▼───────┐           │
│  │            Transaction Orchestrator                │           │
│  └──────┬────────────────────────────────────────────┘           │
│         │                                                        │
│  ┌──────▼──────────────────────────────────────────────────┐     │
│  │              FINANCIAL LEDGER ENGINE                      │     │
│  │                                                          │     │
│  │  ┌────────────┐ ┌────────────┐ ┌────────────┐           │     │
│  │  │ Chart of   │ │ Cost       │ │ Multi-     │           │     │
│  │  │ Accounts   │ │ Centers    │ │ Currency   │           │     │
│  │  └────────────┘ └────────────┘ └────────────┘           │     │
│  │  ┌────────────┐ ┌────────────┐ ┌────────────┐           │     │
│  │  │ Period     │ │ Financial  │ │ Audit      │           │     │
│  │  │ Closing    │ │ Reports    │ │ Trail      │           │     │
│  │  └────────────┘ └────────────┘ └────────────┘           │     │
│  └──────────────────────────────────────────────────────────┘     │
│                                                                   │
│  ┌───────────────────────────────────────────────────────────┐    │
│  │               PostgreSQL Transaction (ACID)                │    │
│  └───────────────────────────────────────────────────────────┘    │
└─────────────────────────────────────────────────────────────────┘
```

---

## 1. Transaction Orchestrator (The Brain)

The orchestrator controls the **exact sequence** of operations when a voucher
is created, updated, or reversed. Everything runs inside a single DB transaction.

### Processing Pipeline

```
┌─────────────────────────────────────────────────────┐
│               BEGIN TRANSACTION (trx)                │
│                                                      │
│  1. Validate header (schema + business rules)        │
│  2. Validate lines  (schema + quantities + rates)    │
│  3. Evaluate expressions (computed fields)           │
│  4. Generate voucher number (Number Sequence Engine)  │
│  5. Convert currency (if foreign currency voucher)   │
│  6. Save voucher header     → voucher_headers        │
│  7. Save line items         → voucher_lines          │
│  8. Save dynamic field values → extra_data JSONB     │
│  9. Generate ledger entries → ledger_entries          │
│     (includes cost center allocation)                │
│  10. Generate stock movements → stock_movements      │
│  11. Create audit snapshot  → audit_trail            │
│  12. Initialize workflow    → workflow_instances      │
│  13. Update number sequence → meta_number_sequence   │
│                                                      │
│               COMMIT TRANSACTION                     │
│                                                      │
│  (on ANY failure → ROLLBACK entire transaction)      │
└─────────────────────────────────────────────────────┘
```

### Implementation

```js
// src/engine/transactionOrchestrator.js

async function processVoucher(voucherData, action, userId, companyId) {
  const trx = await db.transaction();

  try {
    // 1. Load voucher type config from metadata engine
    const voucherConfig = await getVoucherConfig(voucherData.voucherType, companyId);

    // 2. Validate (including period open check)
    const validated = await validateVoucher(voucherData, voucherConfig);
    await validatePeriodOpen(validated.header.date, companyId, trx);

    // 3. Evaluate expressions (computed line fields)
    const lines = evaluateLineExpressions(validated.lines, voucherConfig);

    // 4. Generate voucher number
    const voucherNo = await generateNumber(
      companyId, validated.branchId, validated.voucherType, trx
    );

    // 5. Currency conversion (if foreign currency)
    let currencyData = {};
    if (validated.header.currency_code &&
        validated.header.currency_code !== await getBaseCurrency(companyId)) {
      currencyData = await convertCurrency(validated.header, companyId, trx);
    }

    // 6. Save header
    const [header] = await trx('voucher_headers').insert({
      ...validated.header,
      ...currencyData,
      voucher_no: voucherNo,
      company_id: companyId,
      status: voucherConfig.approval_required ? 'draft' : 'posted',
      created_by: userId,
      created_at: new Date(),
    }).returning('*');

    // 7. Save lines
    const lineRecords = lines.map((line, idx) => ({
      ...line,
      voucher_id: header.id,
      line_number: idx + 1,
    }));
    await trx('voucher_lines').insert(lineRecords);

    // 8. Save dynamic fields (JSONB)
    if (validated.customFields) {
      await trx('voucher_headers')
        .where({ id: header.id })
        .update({ extra_data: JSON.stringify(validated.customFields) });
    }

    // 9. Generate ledger entries (with cost center)
    if (voucherConfig.affects_ledger && header.status === 'posted') {
      const ledgerEntries = await ledgerGenerator.generate(
        header, lineRecords, voucherConfig, trx
      );
      await trx('ledger_entries').insert(ledgerEntries);
    }

    // 10. Generate stock movements
    if (voucherConfig.affects_stock && header.status === 'posted') {
      const movements = await stockEngine.generateMovements(
        header, lineRecords, voucherConfig, trx
      );
      await trx('stock_movements').insert(movements);
    }

    // 11. Audit
    await auditTrail.record(trx, {
      entity_type: 'voucher', entity_id: header.id,
      action, before_data: null, after_data: { header, lines: lineRecords },
      user_id: userId, company_id: companyId,
    });

    // 12. Workflow
    if (voucherConfig.approval_required) {
      await workflowEngine.initialize(trx, header.id, voucherData.voucherType, companyId);
    }

    await trx.commit();
    return { success: true, data: header, voucherNo };
  } catch (error) {
    await trx.rollback();
    throw error;
  }
}
```

---

## 2. Financial Ledger Engine (The Financial Brain)

### 2.1 Chart of Accounts

The Chart of Accounts (COA) is a **hierarchical tree** that classifies all
financial accounts. It is configurable per company.

#### Account Types (Root Groups)

```
Chart of Accounts
├── Assets                    (Natural: Debit)
│   ├── Current Assets
│   │   ├── Cash & Bank
│   │   ├── Accounts Receivable
│   │   └── Inventory
│   └── Fixed Assets
│       ├── Property
│       └── Equipment
├── Liabilities               (Natural: Credit)
│   ├── Current Liabilities
│   │   ├── Accounts Payable
│   │   └── Tax Payable
│   └── Long-Term Liabilities
├── Equity                    (Natural: Credit)
│   ├── Share Capital
│   └── Retained Earnings
├── Revenue                   (Natural: Credit)
│   ├── Sales Revenue
│   └── Other Income
└── Expenses                  (Natural: Debit)
    ├── Cost of Goods Sold
    ├── Operating Expenses
    └── Depreciation
```

#### Table: `accounts`

```sql
CREATE TABLE accounts (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id      UUID NOT NULL REFERENCES companies(id),
  code            VARCHAR(20) NOT NULL,          -- '1000', '1100', '1110'
  name            VARCHAR(200) NOT NULL,         -- 'Cash in Hand'
  alias           VARCHAR(200),

  -- Hierarchy
  parent_id       UUID REFERENCES accounts(id),  -- self-referencing tree
  level           INT NOT NULL DEFAULT 0,         -- depth in tree (0=root)
  is_group        BOOLEAN DEFAULT FALSE,          -- true = grouping node, false = postable

  -- Classification
  account_type    VARCHAR(20) NOT NULL,           -- 'asset','liability','equity','revenue','expense'
  sub_type        VARCHAR(50),                    -- 'current_asset','fixed_asset','cogs', etc.
  natural_balance VARCHAR(10) NOT NULL,           -- 'debit' or 'credit'

  -- Behavior flags
  is_bank         BOOLEAN DEFAULT FALSE,          -- links to bank reconciliation
  is_cash         BOOLEAN DEFAULT FALSE,          -- cash book entry
  is_receivable   BOOLEAN DEFAULT FALSE,          -- party-level subledger (customers)
  is_payable      BOOLEAN DEFAULT FALSE,          -- party-level subledger (vendors)
  is_tax          BOOLEAN DEFAULT FALSE,          -- tax collection / input credit

  -- Party linkage (for subledger accounts)
  party_type      VARCHAR(20),                    -- 'customer', 'vendor', 'employee'

  -- Multi-currency
  currency_code   VARCHAR(3),                     -- account's default currency (NULL = base)
  allow_multi_currency BOOLEAN DEFAULT FALSE,

  -- Status
  status          VARCHAR(20) DEFAULT 'active',   -- 'active', 'inactive', 'frozen'
  is_system       BOOLEAN DEFAULT FALSE,          -- system accounts can't be deleted

  -- Metadata
  extra_data      JSONB DEFAULT '{}',
  created_at      TIMESTAMP DEFAULT NOW(),
  created_by      UUID,
  modified_at     TIMESTAMP,
  modified_by     UUID,

  UNIQUE(company_id, code)
);

-- Tree traversal index
CREATE INDEX idx_accounts_parent ON accounts(company_id, parent_id);
-- Posting lookups
CREATE INDEX idx_accounts_type ON accounts(company_id, account_type, status);
```

#### Account Hierarchy Query (Recursive CTE)

```sql
-- Full tree for a company
WITH RECURSIVE account_tree AS (
  -- Root nodes
  SELECT id, code, name, parent_id, level, account_type, is_group, 0 AS depth
  FROM accounts
  WHERE company_id = $1 AND parent_id IS NULL AND status = 'active'

  UNION ALL

  -- Children
  SELECT a.id, a.code, a.name, a.parent_id, a.level, a.account_type, a.is_group, t.depth + 1
  FROM accounts a
  JOIN account_tree t ON a.parent_id = t.id
  WHERE a.status = 'active'
)
SELECT * FROM account_tree ORDER BY code;
```

#### Rules for Chart of Accounts

1. **Only leaf accounts (is_group=false) can receive postings** — group accounts aggregate children.
2. **Account codes follow a numbering convention**: Assets=1xxx, Liabilities=2xxx, Equity=3xxx, Revenue=4xxx, Expenses=5xxx.
3. **Natural balance determines sign**: Debit-natural balances increase with debits (Assets, Expenses). Credit-natural balances increase with credits (Liabilities, Equity, Revenue).
4. **System accounts** (Cash, Receivable, Payable, Retained Earnings) cannot be deleted or reclassified.
5. **Subledger accounts** (Receivable/Payable) track balances per party (customer/vendor).

---

### 2.2 Cost Centers / Departments

Cost centers provide an **additional dimension** for expense tracking beyond
the chart of accounts. They allow splitting the same expense account across
departments, projects, or divisions.

#### Table: `cost_centers`

```sql
CREATE TABLE cost_centers (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id      UUID NOT NULL REFERENCES companies(id),
  code            VARCHAR(20) NOT NULL,
  name            VARCHAR(200) NOT NULL,
  parent_id       UUID REFERENCES cost_centers(id),
  level           INT DEFAULT 0,
  is_group        BOOLEAN DEFAULT FALSE,
  category        VARCHAR(50),                   -- 'department', 'project', 'region'
  status          VARCHAR(20) DEFAULT 'active',
  
  UNIQUE(company_id, code)
);

CREATE INDEX idx_cc_parent ON cost_centers(company_id, parent_id);
```

#### Cost Center Hierarchy

```
Cost Centers
├── Head Office
│   ├── Administration
│   ├── Finance
│   └── HR
├── Sales Division
│   ├── North Region
│   ├── South Region
│   └── Online Sales
├── Production
│   ├── Factory A
│   └── Factory B
└── Projects
    ├── Project Alpha
    └── Project Beta
```

#### Ledger Entry + Cost Center

The `ledger_entries` table includes a `cost_center_id`:

```sql
-- Additional column in ledger_entries
ALTER TABLE ledger_entries ADD COLUMN cost_center_id UUID REFERENCES cost_centers(id);

CREATE INDEX idx_ledger_cc ON ledger_entries(company_id, cost_center_id, entry_date);
```

In the **ledger template**, cost center can be auto-assigned:

```json
{
  "entries": [
    {
      "type": "debit",
      "accountSource": "config:cogsAccount",
      "amountField": "subtotal",
      "costCenterSource": "header:departmentId",
      "narration": "Cost of goods sold"
    }
  ]
}
```

#### Cost Center Allocation Rules

```sql
CREATE TABLE cost_center_allocations (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id      UUID NOT NULL,
  source_cc_id    UUID NOT NULL REFERENCES cost_centers(id),
  target_cc_id    UUID NOT NULL REFERENCES cost_centers(id),
  percentage      DECIMAL(5,2) NOT NULL,
  account_type    VARCHAR(20),                   -- 'expense' = only split expenses
  financial_year  VARCHAR(10) NOT NULL,
  
  UNIQUE(company_id, source_cc_id, target_cc_id, financial_year)
);
```

---

### 2.3 Multi-Currency Engine

The ERP supports transactions in **any currency** with automatic conversion.

#### Table: `currencies`

```sql
CREATE TABLE currencies (
  code            VARCHAR(3) PRIMARY KEY,        -- 'USD', 'EUR', 'INR', 'QAR'
  name            VARCHAR(100) NOT NULL,
  symbol          VARCHAR(10) NOT NULL,          -- '$', '€', '₹', '﷼'
  decimal_places  INT DEFAULT 2,
  is_active       BOOLEAN DEFAULT TRUE
);
```

#### Table: `exchange_rates`

```sql
CREATE TABLE exchange_rates (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id      UUID NOT NULL,
  from_currency   VARCHAR(3) NOT NULL REFERENCES currencies(code),
  to_currency     VARCHAR(3) NOT NULL REFERENCES currencies(code),
  rate            DECIMAL(18,6) NOT NULL,        -- 1 from = rate * to
  effective_date  DATE NOT NULL,
  source          VARCHAR(50) DEFAULT 'manual',  -- 'manual', 'api', 'bank'
  
  UNIQUE(company_id, from_currency, to_currency, effective_date)
);

CREATE INDEX idx_exrate_lookup ON exchange_rates(company_id, from_currency, to_currency, effective_date DESC);
```

#### Company Base Currency

```sql
-- In companies table
ALTER TABLE companies ADD COLUMN base_currency VARCHAR(3) DEFAULT 'INR' REFERENCES currencies(code);
```

#### Multi-Currency Ledger Entry

The `ledger_entries` table stores **both** transaction currency and base currency amounts:

```sql
-- Additional columns in ledger_entries
ALTER TABLE ledger_entries ADD COLUMN currency_code    VARCHAR(3) REFERENCES currencies(code);
ALTER TABLE ledger_entries ADD COLUMN exchange_rate    DECIMAL(18,6);
ALTER TABLE ledger_entries ADD COLUMN foreign_debit    DECIMAL(18,2) DEFAULT 0;
ALTER TABLE ledger_entries ADD COLUMN foreign_credit   DECIMAL(18,2) DEFAULT 0;
-- debit / credit columns remain in base currency
```

#### Currency Conversion Logic

```js
// src/engine/currencyEngine.js

async function convertCurrency(header, companyId, trx) {
  const baseCurrency = await getBaseCurrency(companyId);
  
  if (header.currency_code === baseCurrency) {
    return { exchange_rate: 1.0 };
  }

  const rate = await getExchangeRate(
    companyId,
    header.currency_code,
    baseCurrency,
    header.date,
    trx
  );

  if (!rate) {
    throw new Error(
      `Exchange rate not found for ${header.currency_code} → ${baseCurrency} on ${header.date}`
    );
  }

  return {
    currency_code: header.currency_code,
    exchange_rate: rate,
    // Base currency amounts = foreign * rate
    subtotal: round(header.subtotal * rate, 2),
    tax_total: round(header.tax_total * rate, 2),
    grand_total: round(header.grand_total * rate, 2),
    // Store originals as foreign amounts
    foreign_subtotal: header.subtotal,
    foreign_grand_total: header.grand_total,
  };
}

async function getExchangeRate(companyId, from, to, date, trx) {
  // Get the latest rate on or before the given date
  const result = await trx('exchange_rates')
    .where({ company_id: companyId, from_currency: from, to_currency: to })
    .where('effective_date', '<=', date)
    .orderBy('effective_date', 'desc')
    .first();

  return result?.rate ?? null;
}
```

#### Foreign Currency Posting

When posting a foreign currency voucher, the **ledger generator** stores both:

```js
// In ledgerGenerator.generate():
entries.push({
  // ... standard fields ...
  currency_code: header.currency_code,
  exchange_rate: header.exchange_rate,
  foreign_debit: mapping.type === 'debit' ? foreignAmount : 0,
  foreign_credit: mapping.type === 'credit' ? foreignAmount : 0,
  debit: mapping.type === 'debit' ? baseAmount : 0,    // in base currency
  credit: mapping.type === 'credit' ? baseAmount : 0,  // in base currency
});
```

#### Exchange Differences

When settling foreign currency receivables/payables at a different rate:

```js
async function postExchangeDifference(settlementHeader, originalRate, settlementRate, trx) {
  const diff = (settlementRate - originalRate) * foreignAmount;

  if (Math.abs(diff) > 0.01) {
    const exchangeAccount = await getConfigAccount('exchangeGainLoss', companyId, trx);

    await trx('ledger_entries').insert({
      voucher_id: settlementHeader.id,
      voucher_type: 'exchange_difference',
      entry_date: settlementHeader.date,
      account_id: exchangeAccount,
      debit: diff > 0 ? diff : 0,         // gain
      credit: diff < 0 ? Math.abs(diff) : 0, // loss
      narration: `Exchange difference on ${settlementHeader.reference}`,
      company_id: settlementHeader.company_id,
      branch_id: settlementHeader.branch_id,
    });
  }
}
```

---

### 2.4 Financial Periods & Period Closing

#### Table: `financial_periods`

```sql
CREATE TABLE financial_periods (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id      UUID NOT NULL REFERENCES companies(id),
  financial_year  VARCHAR(10) NOT NULL,          -- '2025-26'
  period_number   INT NOT NULL,                  -- 1-12 (or 1-13 for closing period)
  period_name     VARCHAR(50) NOT NULL,          -- 'April 2025', 'May 2025', ...
  start_date      DATE NOT NULL,
  end_date        DATE NOT NULL,
  status          VARCHAR(20) DEFAULT 'open',    -- 'open', 'closed', 'locked'
  closed_by       UUID REFERENCES users(id),
  closed_at       TIMESTAMP,

  UNIQUE(company_id, financial_year, period_number)
);

CREATE INDEX idx_periods_lookup ON financial_periods(company_id, start_date, end_date);
```

#### Period Status Flow

```
Open  →  Soft Close  →  Hard Close  →  Locked
 ↑          ↓
 └── Reopen (admin only, audit logged)
```

| Status   | Can Post? | Can Modify? | Can Reopen? |
| -------- | --------- | ----------- | ----------- |
| `open`   | ✅        | ✅          | N/A         |
| `closed` | ❌        | ❌          | ✅ (admin)  |
| `locked` | ❌        | ❌          | ❌          |

#### Period Validation (enforced in orchestrator)

```js
async function validatePeriodOpen(date, companyId, trx) {
  const period = await trx('financial_periods')
    .where({ company_id: companyId })
    .where('start_date', '<=', date)
    .where('end_date', '>=', date)
    .first();

  if (!period) {
    throw new Error(`No financial period defined for date ${date}`);
  }
  if (period.status !== 'open') {
    throw new Error(
      `Financial period "${period.period_name}" is ${period.status}. Cannot post.`
    );
  }
  return period;
}
```

#### Period Closing Process

```js
// src/engine/periodClosing.js

async function closePeriod(companyId, periodId, userId) {
  const trx = await db.transaction();

  try {
    const period = await trx('financial_periods').where({ id: periodId }).first();

    // 1. Validate: all vouchers in period are posted or cancelled
    const pendingVouchers = await trx('voucher_headers')
      .where({ company_id: companyId, status: 'draft' })
      .whereBetween('date', [period.start_date, period.end_date])
      .count('id as count');

    if (pendingVouchers[0].count > 0) {
      throw new Error(`${pendingVouchers[0].count} draft vouchers pending in this period`);
    }

    // 2. Validate: ledger balanced (debits = credits)
    const balance = await trx('ledger_entries')
      .where({ company_id: companyId })
      .whereBetween('entry_date', [period.start_date, period.end_date])
      .select(
        trx.raw('SUM(debit) as total_debit'),
        trx.raw('SUM(credit) as total_credit')
      )
      .first();

    if (Math.abs(balance.total_debit - balance.total_credit) > 0.01) {
      throw new Error('Ledger is not balanced for this period');
    }

    // 3. Mark period as closed
    await trx('financial_periods')
      .where({ id: periodId })
      .update({ status: 'closed', closed_by: userId, closed_at: new Date() });

    // 4. Audit
    await auditTrail.record(trx, {
      entity_type: 'period', entity_id: periodId,
      action: 'close', before_data: { status: 'open' },
      after_data: { status: 'closed' },
      user_id: userId, company_id: companyId,
    });

    await trx.commit();
  } catch (error) {
    await trx.rollback();
    throw error;
  }
}
```

#### Year-End Closing

```js
async function yearEndClose(companyId, financialYear, userId) {
  const trx = await db.transaction();

  try {
    // 1. Calculate net profit/loss for the year
    const profitLoss = await trx('ledger_entries as le')
      .join('accounts as a', 'le.account_id', 'a.id')
      .where('le.company_id', companyId)
      .whereIn('a.account_type', ['revenue', 'expense'])
      .whereBetween('le.entry_date', [yearStart, yearEnd])
      .select(
        trx.raw('SUM(le.credit) - SUM(le.debit) as net_profit')
      )
      .first();

    // 2. Post closing entry: transfer P&L to Retained Earnings
    const retainedEarnings = await getConfigAccount('retainedEarnings', companyId, trx);
    const plSummary = await getConfigAccount('profitLossSummary', companyId, trx);

    const closingVoucher = await processVoucher({
      voucherType: 'JOURNAL_ENTRY',
      header: {
        date: yearEnd,
        narration: `Year-end closing FY ${financialYear}`,
      },
      lines: [
        {
          account_id: plSummary,
          debit: profitLoss.net_profit > 0 ? profitLoss.net_profit : 0,
          credit: profitLoss.net_profit < 0 ? Math.abs(profitLoss.net_profit) : 0,
        },
        {
          account_id: retainedEarnings,
          debit: profitLoss.net_profit < 0 ? Math.abs(profitLoss.net_profit) : 0,
          credit: profitLoss.net_profit > 0 ? profitLoss.net_profit : 0,
        },
      ],
    }, 'year_end_close', userId, companyId);

    // 3. Lock all periods of this FY
    await trx('financial_periods')
      .where({ company_id: companyId, financial_year: financialYear })
      .update({ status: 'locked' });

    // 4. Create opening balances for next FY
    await generateOpeningBalances(companyId, financialYear, trx);

    await trx.commit();
  } catch (error) {
    await trx.rollback();
    throw error;
  }
}
```

#### Opening Balances

```js
async function generateOpeningBalances(companyId, closedFY, trx) {
  const nextFYStart = getNextFYStartDate(closedFY);

  // Balance sheet accounts (Asset, Liability, Equity) carry forward
  // Revenue & Expense accounts reset to zero (already closed to Retained Earnings)
  const balances = await trx('ledger_entries as le')
    .join('accounts as a', 'le.account_id', 'a.id')
    .where('le.company_id', companyId)
    .whereIn('a.account_type', ['asset', 'liability', 'equity'])
    .where('le.entry_date', '<', nextFYStart)
    .groupBy('le.account_id')
    .select('le.account_id')
    .select(trx.raw('SUM(le.debit) - SUM(le.credit) as balance'));

  for (const row of balances) {
    if (Math.abs(row.balance) < 0.01) continue;

    await trx('ledger_entries').insert({
      voucher_type: 'OPENING_BALANCE',
      entry_date: nextFYStart,
      account_id: row.account_id,
      debit: row.balance > 0 ? row.balance : 0,
      credit: row.balance < 0 ? Math.abs(row.balance) : 0,
      narration: `Opening balance FY ${getNextFY(closedFY)}`,
      company_id: companyId,
    });
  }
}
```

---

### 2.5 Financial Reporting Engine

All financial reports are **derived from ledger_entries** — never from stored balances.

#### Core Reports

| Report              | SQL Strategy                                            |
| ------------------- | ------------------------------------------------------- |
| **Trial Balance**   | Group by account, sum debits/credits                    |
| **Profit & Loss**   | Filter Revenue + Expenses, group by account type        |
| **Balance Sheet**   | Filter Assets + Liabilities + Equity, show tree         |
| **Cash Flow**       | Filter bank/cash accounts, group by category            |
| **General Ledger**  | All entries for one account, ordered by date            |
| **Day Book**        | All entries for one date, ordered by voucher            |
| **Receivable Aging**| Party-wise outstanding with age buckets                 |
| **Payable Aging**   | Vendor-wise outstanding with age buckets                |

#### Trial Balance Query

```sql
SELECT
  a.code,
  a.name,
  a.account_type,
  a.natural_balance,
  COALESCE(SUM(le.debit), 0) AS total_debit,
  COALESCE(SUM(le.credit), 0) AS total_credit,
  COALESCE(SUM(le.debit), 0) - COALESCE(SUM(le.credit), 0) AS net_balance
FROM accounts a
LEFT JOIN ledger_entries le ON a.id = le.account_id
  AND le.company_id = $1
  AND le.entry_date BETWEEN $2 AND $3
WHERE a.company_id = $1
  AND a.is_group = FALSE
  AND a.status = 'active'
GROUP BY a.id, a.code, a.name, a.account_type, a.natural_balance
HAVING COALESCE(SUM(le.debit), 0) != 0 OR COALESCE(SUM(le.credit), 0) != 0
ORDER BY a.code;
```

#### Profit & Loss Statement

```sql
-- Revenue (credit-natural → positive balance = credit-debit)
SELECT 'Revenue' AS section, a.code, a.name,
  COALESCE(SUM(le.credit), 0) - COALESCE(SUM(le.debit), 0) AS amount
FROM accounts a
LEFT JOIN ledger_entries le ON a.id = le.account_id
  AND le.entry_date BETWEEN $2 AND $3
WHERE a.company_id = $1 AND a.account_type = 'revenue' AND a.is_group = FALSE
GROUP BY a.id, a.code, a.name

UNION ALL

-- Expenses (debit-natural → positive balance = debit-credit)
SELECT 'Expense' AS section, a.code, a.name,
  COALESCE(SUM(le.debit), 0) - COALESCE(SUM(le.credit), 0) AS amount
FROM accounts a
LEFT JOIN ledger_entries le ON a.id = le.account_id
  AND le.entry_date BETWEEN $2 AND $3
WHERE a.company_id = $1 AND a.account_type = 'expense' AND a.is_group = FALSE
GROUP BY a.id, a.code, a.name

ORDER BY section, code;
```

#### Balance Sheet (Hierarchical)

```sql
WITH RECURSIVE account_tree AS (
  SELECT id, code, name, parent_id, account_type, 0 AS depth
  FROM accounts
  WHERE company_id = $1 AND parent_id IS NULL
    AND account_type IN ('asset', 'liability', 'equity')

  UNION ALL

  SELECT a.id, a.code, a.name, a.parent_id, a.account_type, t.depth + 1
  FROM accounts a
  JOIN account_tree t ON a.parent_id = t.id
),
balances AS (
  SELECT
    le.account_id,
    SUM(le.debit) - SUM(le.credit) AS balance
  FROM ledger_entries le
  WHERE le.company_id = $1 AND le.entry_date <= $2
  GROUP BY le.account_id
)
SELECT
  at.code, at.name, at.account_type, at.depth,
  COALESCE(b.balance, 0) AS balance
FROM account_tree at
LEFT JOIN balances b ON at.id = b.account_id
ORDER BY at.code;
```

#### Receivable/Payable Aging

```sql
SELECT
  a.id AS party_id,
  a.name AS party_name,
  SUM(CASE
    WHEN CURRENT_DATE - le.entry_date <= 30 THEN le.debit - le.credit
    ELSE 0
  END) AS "0_30_days",
  SUM(CASE
    WHEN CURRENT_DATE - le.entry_date BETWEEN 31 AND 60 THEN le.debit - le.credit
    ELSE 0
  END) AS "31_60_days",
  SUM(CASE
    WHEN CURRENT_DATE - le.entry_date BETWEEN 61 AND 90 THEN le.debit - le.credit
    ELSE 0
  END) AS "61_90_days",
  SUM(CASE
    WHEN CURRENT_DATE - le.entry_date > 90 THEN le.debit - le.credit
    ELSE 0
  END) AS "over_90_days",
  SUM(le.debit - le.credit) AS total_outstanding
FROM ledger_entries le
JOIN accounts a ON le.account_id = a.id
WHERE a.company_id = $1
  AND a.is_receivable = TRUE          -- or is_payable for vendors
GROUP BY a.id, a.name
HAVING SUM(le.debit - le.credit) != 0
ORDER BY total_outstanding DESC;
```

#### Cost Center Report

```sql
SELECT
  cc.name AS cost_center,
  a.account_type,
  SUM(le.debit) AS total_debit,
  SUM(le.credit) AS total_credit,
  SUM(le.debit) - SUM(le.credit) AS net
FROM ledger_entries le
JOIN cost_centers cc ON le.cost_center_id = cc.id
JOIN accounts a ON le.account_id = a.id
WHERE le.company_id = $1
  AND le.entry_date BETWEEN $2 AND $3
GROUP BY cc.id, cc.name, a.account_type
ORDER BY cc.name, a.account_type;
```

#### Multi-Currency Report

```sql
SELECT
  le.currency_code,
  a.name AS account_name,
  SUM(le.foreign_debit) AS foreign_debit,
  SUM(le.foreign_credit) AS foreign_credit,
  SUM(le.foreign_debit) - SUM(le.foreign_credit) AS foreign_balance,
  SUM(le.debit) AS base_debit,
  SUM(le.credit) AS base_credit,
  SUM(le.debit) - SUM(le.credit) AS base_balance
FROM ledger_entries le
JOIN accounts a ON le.account_id = a.id
WHERE le.company_id = $1
  AND le.currency_code IS NOT NULL
  AND le.entry_date BETWEEN $2 AND $3
GROUP BY le.currency_code, a.id, a.name
ORDER BY le.currency_code, a.name;
```

---

## 3. Stock Movement Engine

Generates inventory movements from voucher lines.

### Core Principles

1. **Event-driven** — stock is derived from movements, never stored as balance
2. **Immutable** — movements are never updated; corrections via reversals
3. **Warehouse mandatory** — every movement tied to a warehouse
4. **Voucher linked** — every movement traces to a voucher

### Table: `stock_movements`

```sql
CREATE TABLE stock_movements (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  voucher_id      UUID NOT NULL REFERENCES voucher_headers(id),
  voucher_type    VARCHAR(50) NOT NULL,
  voucher_no      VARCHAR(100) NOT NULL,
  movement_date   DATE NOT NULL,
  product_id      UUID NOT NULL REFERENCES products(id),
  warehouse_id    UUID NOT NULL REFERENCES warehouses(id),
  movement_type   VARCHAR(50) NOT NULL,
  direction       VARCHAR(10) NOT NULL,
  quantity        DECIMAL(18,4) NOT NULL,
  rate            DECIMAL(18,4) NOT NULL,
  amount          DECIMAL(18,2) NOT NULL,
  batch_no        VARCHAR(100),
  serial_no       VARCHAR(100),
  company_id      UUID NOT NULL,
  branch_id       UUID NOT NULL,
  is_reversal     BOOLEAN DEFAULT FALSE,
  reversal_of     UUID REFERENCES stock_movements(id),
  created_at      TIMESTAMP DEFAULT NOW()
) PARTITION BY RANGE (movement_date);
```

### Movement Type Mapping

| Voucher Type       | Movement Type        | Direction |
| ------------------ | -------------------- | --------- |
| Purchase Invoice   | `purchase`           | `in`      |
| Sales Invoice      | `sale`               | `out`     |
| Stock Transfer     | `transfer_out/in`    | both      |
| Production Issue   | `production_issue`   | `out`     |
| Production Receipt | `production_receipt` | `in`      |
| Stock Adjustment   | `adjustment`         | both      |

---

## 4. Voucher Reversal Engine

Corrections are made by **reversing** the original voucher, never by editing.

```js
async function reverseVoucher(voucherId, reason, userId, trx) {
  const original = await trx('voucher_headers').where({ id: voucherId }).first();

  // Validate period is open for reversal date
  await validatePeriodOpen(new Date(), original.company_id, trx);

  // 1. Mark original as reversed
  await trx('voucher_headers')
    .where({ id: voucherId })
    .update({ status: 'reversed', modified_at: new Date(), modified_by: userId });

  // 2. Create reversal header
  const [reversal] = await trx('voucher_headers').insert({
    ...original, id: undefined,
    voucher_no: original.voucher_no + '-REV',
    status: 'posted', is_reversal: true, reversal_of: voucherId,
    narration: `Reversal of ${original.voucher_no}: ${reason}`,
    created_by: userId, created_at: new Date(),
  }).returning('*');

  // 3. Reverse ledger entries (swap debit/credit)
  const originalLedger = await trx('ledger_entries').where({ voucher_id: voucherId });
  await trx('ledger_entries').insert(originalLedger.map(le => ({
    ...le, id: undefined, voucher_id: reversal.id, voucher_no: reversal.voucher_no,
    debit: le.credit, credit: le.debit,
    foreign_debit: le.foreign_credit, foreign_credit: le.foreign_debit,
    is_reversal: true, reversal_of: le.id,
  })));

  // 4. Reverse stock movements (flip direction)
  const originalStock = await trx('stock_movements').where({ voucher_id: voucherId });
  await trx('stock_movements').insert(originalStock.map(sm => ({
    ...sm, id: undefined, voucher_id: reversal.id, voucher_no: reversal.voucher_no,
    direction: sm.direction === 'in' ? 'out' : 'in',
    is_reversal: true, reversal_of: sm.id,
  })));

  // 5. Audit
  await auditTrail.record(trx, {
    entity_type: 'voucher', entity_id: reversal.id,
    action: 'reversal', before_data: original, after_data: reversal,
    user_id: userId, company_id: original.company_id,
  });

  return reversal;
}
```

---

## 5. Audit Trail

### Table: `audit_trail`

```sql
CREATE TABLE audit_trail (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  entity_type     VARCHAR(100) NOT NULL,
  entity_id       UUID NOT NULL,
  action          VARCHAR(50) NOT NULL,
  before_data     JSONB,
  after_data      JSONB,
  changed_fields  JSONB,
  user_id         UUID NOT NULL,
  user_email      VARCHAR(200),
  company_id      UUID NOT NULL,
  ip_address      VARCHAR(50),
  created_at      TIMESTAMP DEFAULT NOW()
);
CREATE INDEX idx_audit_entity ON audit_trail(entity_type, entity_id);
CREATE INDEX idx_audit_company ON audit_trail(company_id, created_at DESC);
```

---

## 6. Voucher Tables

### `voucher_headers`

```sql
CREATE TABLE voucher_headers (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  voucher_no      VARCHAR(100) NOT NULL,
  voucher_type    VARCHAR(50) NOT NULL,
  date            DATE NOT NULL,
  party_id        UUID REFERENCES accounts(id),
  party_name      VARCHAR(200),
  reference       VARCHAR(200),
  narration       TEXT,
  -- Amounts (base currency)
  subtotal        DECIMAL(18,2) DEFAULT 0,
  tax_total       DECIMAL(18,2) DEFAULT 0,
  discount_total  DECIMAL(18,2) DEFAULT 0,
  grand_total     DECIMAL(18,2) DEFAULT 0,
  -- Multi-currency
  currency_code   VARCHAR(3) REFERENCES currencies(code),
  exchange_rate   DECIMAL(18,6) DEFAULT 1.0,
  foreign_grand_total DECIMAL(18,2),
  -- Status
  status          VARCHAR(20) DEFAULT 'draft',
  is_reversal     BOOLEAN DEFAULT FALSE,
  reversal_of     UUID REFERENCES voucher_headers(id),
  -- Extensions
  extra_data      JSONB DEFAULT '{}',
  -- Scoping
  company_id      UUID NOT NULL,
  branch_id       UUID NOT NULL,
  department_id   UUID,
  cost_center_id  UUID REFERENCES cost_centers(id),
  warehouse_id    UUID,
  to_warehouse_id UUID,
  -- Timestamps
  created_by      UUID NOT NULL,
  created_at      TIMESTAMP DEFAULT NOW(),
  modified_by     UUID,
  modified_at     TIMESTAMP,
  posted_by       UUID,
  posted_at       TIMESTAMP,
  UNIQUE(company_id, voucher_no)
) PARTITION BY RANGE (date);
```

### `voucher_lines`

```sql
CREATE TABLE voucher_lines (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  voucher_id      UUID NOT NULL REFERENCES voucher_headers(id),
  line_number     INT NOT NULL,
  product_id      UUID REFERENCES products(id),
  product_name    VARCHAR(200),
  description     TEXT,
  account_id      UUID REFERENCES accounts(id),
  cost_center_id  UUID REFERENCES cost_centers(id),
  quantity        DECIMAL(18,4) DEFAULT 0,
  rate            DECIMAL(18,4) DEFAULT 0,
  discount_pct    DECIMAL(5,2) DEFAULT 0,
  discount_amt    DECIMAL(18,2) DEFAULT 0,
  tax_pct         DECIMAL(5,2) DEFAULT 0,
  tax_amt         DECIMAL(18,2) DEFAULT 0,
  line_total      DECIMAL(18,2) DEFAULT 0,
  warehouse_id    UUID,
  batch_no        VARCHAR(100),
  serial_no       VARCHAR(100),
  extra_data      JSONB DEFAULT '{}',
  UNIQUE(voucher_id, line_number)
);
```

---

## 7. Transaction Engine API

| Endpoint                            | Method | Purpose                              |
| ----------------------------------- | ------ | ------------------------------------ |
| `/api/voucher/:type`                | POST   | Create + post voucher (full pipeline)|
| `/api/voucher/:type/:id`            | GET    | Get voucher with lines + ledger      |
| `/api/voucher/:type/:id`            | PUT    | Update draft voucher                 |
| `/api/voucher/:type/:id/post`       | POST   | Post a draft voucher                 |
| `/api/voucher/:type/:id/reverse`    | POST   | Reverse a posted voucher             |
| `/api/voucher/:type/:id/approve`    | POST   | Advance workflow                     |
| `/api/voucher/:type/:id/reject`     | POST   | Reject in workflow                   |
| `/api/voucher/:type/:id/ledger`     | GET    | View ledger entries for voucher      |
| `/api/voucher/:type/:id/stock`      | GET    | View stock movements for voucher     |
| `/api/voucher/:type/:id/audit`      | GET    | View audit trail for voucher         |

### Financial Report APIs

| Endpoint                            | Method | Purpose                              |
| ----------------------------------- | ------ | ------------------------------------ |
| `/api/reports/trial-balance`        | GET    | Trial balance for date range         |
| `/api/reports/profit-loss`          | GET    | P&L statement                        |
| `/api/reports/balance-sheet`        | GET    | Balance sheet as of date             |
| `/api/reports/general-ledger`       | GET    | Account ledger detail                |
| `/api/reports/day-book`             | GET    | All entries for a date               |
| `/api/reports/receivable-aging`     | GET    | Customer aging analysis              |
| `/api/reports/payable-aging`        | GET    | Vendor aging analysis                |
| `/api/reports/cost-center`          | GET    | Expense by cost center               |
| `/api/reports/currency`             | GET    | Multi-currency position              |

### Financial Master APIs

| Endpoint                            | Method | Purpose                              |
| ----------------------------------- | ------ | ------------------------------------ |
| `/api/accounts`                     | GET    | Chart of accounts (tree)             |
| `/api/accounts/:id`                 | GET    | Account detail                       |
| `/api/accounts`                     | POST   | Create account                       |
| `/api/accounts/:id`                 | PUT    | Update account                       |
| `/api/cost-centers`                 | GET    | Cost center tree                     |
| `/api/cost-centers`                 | POST   | Create cost center                   |
| `/api/currencies`                   | GET    | Active currencies                    |
| `/api/exchange-rates`               | GET    | Exchange rate history                 |
| `/api/exchange-rates`               | POST   | Add exchange rate                    |
| `/api/financial-periods`            | GET    | Periods for FY                       |
| `/api/financial-periods/:id/close`  | POST   | Close a period                       |
| `/api/financial-periods/:id/reopen` | POST   | Reopen a closed period (admin)       |
| `/api/year-end/close`               | POST   | Year-end closing process             |

---

## Key Rules Summary

1. **Everything inside a single DB transaction** — header, lines, ledger, stock, audit
2. **Ledger entries are immutable** — never update, only reverse
3. **Stock is derived** — never store balances, always compute from movements
4. **Double-entry enforced** — `∑ Debits = ∑ Credits` validated before commit
5. **Reversals, not edits** — posted vouchers are corrected by creating reversals
6. **Period validation** — no posting to closed/locked periods
7. **Multi-currency dual posting** — foreign amount + base currency amount stored
8. **Cost center tracking** — optional dimensional analysis on every ledger entry
9. **Chart of accounts hierarchy** — only leaf accounts receive postings
10. **Audit everything** — before/after snapshots for every mutation
11. **Number sequences row-locked** — prevents duplicate numbers under concurrency
12. **Partitioned tables** — vouchers, ledger, stock partitioned by date range
13. **Year-end closing** — P&L → Retained Earnings, opening balances generated
