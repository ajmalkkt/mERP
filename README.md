# mERP Platform

Welcome to the internal mERP (MerakiAi ERP) Enterprise Platform. This repository contains the Next-Generation, metadata-driven architecture for robust horizontal scaling.

## Repository Structure

The architecture is explicitly split:
- `/merp-service`: The Backend / Metadata Engine (Node.js/Express, TypeScript, Prisma, PostgreSQL)
- `/merp-ui`: The Dynamic Front-End (React, Vite, Tailwind CSS v4)
- `/.agents/skills`: The comprehensive reference architectural design standards. *Do not commence development without cross-referencing these skills!*

---

## Local Development Setup Guide

### 1. Prerequisites
- **Node.js** (v18+)
- **PostgreSQL** (v14+) running locally on default port `5432`.

### 2. Database Initialization
mERP utilizes a strictly abstracted metadata schema. Before running the service, you must create a dedicated `merp_db` and role.

1. Navigate to the backend directory:
   ```bash
   cd merp-service
   ```
2. Create or verify your `.env` file matches your local Postgres Admin credentials so the automated script can initialize the ERP database:
   ```env
   # .env
   PG_ADMIN_USER=postgres
   PG_ADMIN_PASSWORD=your_local_postgres_password
   PG_HOST=localhost
   PG_PORT=5432
   PG_ADMIN_DB=postgres

   # The script will create this role automatically:
   DATABASE_URL="postgresql://merp_user:merp123!@localhost:5432/merp_db"
   ```
3. Run the setup script to provision the DB and Roles:
   ```bash
   node setup-db.js
   ```
   *(Expected output: `✅ Created Database: merp_db`)*

4. Push the Prisma Schema and seed the required initial Metadata configurations:
   ```bash
   npx prisma db push
   npx ts-node prisma/seed.ts
   ```

### 3. Running the Backend (merp-service)
Keep the terminal located in `/merp-service/`:
1. Install dependencies: `npm install`
2. Start the development server (runs on `http://localhost:5000`):
   ```bash
   npm run dev
   ```

### 4. Running the Frontend (merp-ui)
Open a new terminal session and navigate to the UI directory:
1. `cd merp-ui`
2. Install dependencies: `npm install`
3. Start the Vite server:
   ```bash
   npm run dev
   ```

Visit `http://localhost:5173` to interact with the mERP Application. Navigate to the **"Product Master"** route to witness the Metadata Engine constructing the UI layout completely dynamically based on the Database configurations you just seeded!
