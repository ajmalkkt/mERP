---
name: reporting-analytics-engine
description: Generates dynamic SQL for Star Schema analytics, manages dashboard metadata, and calculates real-time KPIs.
---

# Goal
Convert raw transactional data into high-speed executive insights without hardcoded SQL reports. Provide real-time dashboards, drill-down analytics, financial statements, cross-module insights, and operational KPIs.

# Core Design Philosophy
- **Modern ERP Reporting**: Reports are metadata-driven, not hardcoded.
- **CQRS Pattern**: Never run heavy reports on transaction tables. Separate Operational DB (transactional) from Analytics Schema (read-optimized).

# Architecture
`Operational DB (Postgres/MS SQL) -> CDC / ETL / Views -> Analytics Schema (Read Optimized) -> Reporting Engine -> Dashboard UI`

# Data Warehouse Style Model
Introduce Star Schema for high performance.
- **Fact Tables (Measures)**: `sales_fact` (Sales analytics), `purchase_fact` (Procurement), `stock_fact` (Inventory), `finance_fact` (Ledger balances), `production_fact` (Manufacturing).
- **Dimension Tables**: `dim_product`, `dim_customer`, `dim_branch`, `dim_date`, `dim_salesman`.

# Instructions

## 1. Report Metadata Engine
Define reports without coding.
- **`report_definition`**: `report_id` (PK), `name` (e.g., Sales Summary), `dataset` (e.g., `sales_fact`), `report_type` (TABLE/CHART), `is_dashboard` (bool)
- **`report_column`**: `column_id`, `report_id`, `field_name` (e.g., sales_amount), `aggregation` (e.g., SUM), `display_name`
- **`report_filter`**: `filter_name`, `source_dimension`,  `ui_type`

## 2. Dynamic Query Generator
Engine automatically builds SQL dynamically based on `report_definition` and `report_column` metadata.
Example Generated SQL: `SELECT branch, SUM(sales_amount) FROM sales_fact WHERE date BETWEEN X AND Y GROUP BY branch`

## 3. Dashboard Engine
Dashboards are collections of widgets.
- **`dashboard`**: `dashboard_id`, `name`, `role_visibility`
- **`dashboard_widget`**: `widget_id`, `report_id`, `chart_type`, `position_x`, `position_y`
- **Supported Visualizations**: KPI Cards, Tables, Pivot grids, Bar/Line/Pie charts, Heatmaps, Trend indicators.

## 4. Drill-Down Capability (Enterprise Feature)
Navigate from high-level summaries to individual vouchers.
- Identify `drill_target_report_id` when a data point is clicked.
- Pass dimensions (e.g., Branch) as filters to the target report down to the voucher level.

## 5. Financial Reporting Engine
Special layer for Trial Balance, Balance Sheet, Profit & Loss, Cash Flow, Aging Reports.
- **Ledger Snapshot Table**: `ledger_balance_daily` (`date`, `account`, `debit`, `credit`, `balance`) - generated nightly or incrementally.

## 6. KPI Engine
KPIs defined dynamically using formulas.
- **`kpi_definition`**: `kpi_id`, `name`, `formula` (e.g., `(Sales - Cost) / Sales`), `target_value`
- Evaluate calculation at the application layer or via generated SQL math.

# Security Model
- **Row-level security**: Reports are automatically filtered by Company, Branch, Department, Role. 
- Avoid data leakage between tenants.

# Performance Strategy
- **Key Optimizations**: Materialized views, Column indexing, Partition pruning, Cache layer (Redis optional), Async refresh jobs.
- **Real-Time vs Analytical**: Operational reports use live tables, Analytical use Fact tables, Financial use Ledger snapshot.
- Make the reporting engine AI-ready due to its metadata-driven nature, allowing future unstructured generation ("Show me sales drop reasons").

# Architecture Placement
UI Layer -> Metadata Engine -> Workflow Engine -> Transaction Engine -> Ledger Engine -> Reporting Engine ⭐ -> Analytics DB