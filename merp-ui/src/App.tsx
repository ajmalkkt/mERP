import React from 'react';
import { Routes, Route, Link, useLocation } from 'react-router-dom';
import { Dashboard } from './components/Dashboard';

import CompanyMaster from './modules/masters/Company/CompanyMaster';
import BranchMaster from './modules/masters/Branch/BranchMaster';
import DepartmentMaster from './modules/masters/Department/DepartmentMaster';
import UserMaster from './modules/masters/User/UserMaster';
import RoleMaster from './modules/masters/Role/RoleMaster';
import ItemMaster from './modules/masters/Item/ItemMaster';
import AccountMaster from './modules/masters/Account/AccountMaster';
import CategoryMaster from './modules/masters/Category/CategoryMaster';
import UnitMaster from './modules/masters/Unit/UnitMaster';
import WarehouseMaster from './modules/masters/Warehouse/WarehouseMaster';

import { VoucherScreen } from './components/VoucherScreen';

function Layout({ children }: { children: React.ReactNode }) {
  const location = useLocation();

  const navLink = (path: string, icon: string, label: string) => (
    <Link
      to={path}
      className={`block px-4 py-2.5 rounded-lg font-medium transition-colors ${
        location.pathname === path || location.pathname.startsWith(path + '/')
          ? 'bg-merp-primary text-white shadow-md'
          : 'hover:bg-slate-800 hover:text-white text-slate-400'
      }`}
    >
      <span className="flex items-center gap-3">{icon} {label}</span>
    </Link>
  );

  return (
    <div className="flex h-screen bg-merp-background font-sans text-merp-secondary">
      {/* Sidebar */}
      <aside className="w-64 bg-merp-secondary border-r border-slate-800 flex flex-col shadow-xl text-slate-300 z-20">
        <div className="p-6 pb-8 border-b border-slate-700/50 mb-4">
          <div className="font-black text-3xl tracking-tight text-white flex gap-2 items-center">
             <div className="w-8 h-8 rounded-lg bg-merp-primary rotate-3"></div>
             mERP.io
          </div>
          <div className="text-xs font-medium text-slate-400 mt-1 uppercase tracking-widest pl-10">Platform</div>
        </div>
        <nav className="flex-1 px-3 space-y-1 overflow-y-auto pb-4">
          <div className="text-xs font-semibold text-slate-500 uppercase tracking-wider px-4 mt-4 mb-2">Core</div>
          {navLink('/', '🏠', 'Dashboard')}
          
          <div className="text-xs font-semibold text-slate-500 uppercase tracking-wider px-4 mt-6 mb-2">Organization</div>
          {navLink('/masters/companies', '🏢', 'Companies')}
          {navLink('/masters/branches', '🏬', 'Branches')}
          {navLink('/masters/departments', '👥', 'Departments')}
          {navLink('/masters/users', '👤', 'Users')}
          {navLink('/masters/roles', '🔐', 'Roles')}

          <div className="text-xs font-semibold text-slate-500 uppercase tracking-wider px-4 mt-6 mb-2">Masters</div>
          {navLink('/masters/items', '📦', 'Items')}
          {navLink('/masters/accounts', '📊', 'Chart of Accounts')}
          {navLink('/masters/categories', '🏷️', 'Categories')}
          {navLink('/masters/units', '📐', 'Units')}
          {navLink('/masters/warehouses', '🏭', 'Warehouses')}

          <div className="text-xs font-semibold text-slate-500 uppercase tracking-wider px-4 mt-6 mb-2">Transactions</div>
          {navLink('/vouchers', '🧾', 'Transaction Entry')}

          <div className="text-xs font-semibold text-slate-500 uppercase tracking-wider px-4 mt-6 mb-2">System</div>
          {navLink('/metadata', '⚙️', 'Metadata Engine')}
        </nav>
        <div className="p-4 border-t border-slate-800 mt-auto">
           <div className="flex items-center gap-3 text-sm">
             <div className="w-10 h-10 rounded-full bg-slate-700 border-2 border-slate-600"></div>
             <div>
               <div className="text-white font-medium">Admin User</div>
               <div className="text-slate-500 text-xs">HQ Branch</div>
             </div>
           </div>
        </div>
      </aside>

      {/* Main Content */}
      <main className="flex-1 overflow-auto flex flex-col bg-slate-50/50">
        <header className="bg-white border-b border-slate-200 h-[72px] flex items-center px-8 justify-between shadow-sm z-10 shrink-0">
          <div className="relative w-96">
            <input type="text" placeholder="Global search... (Ctrl+K)" className="w-full bg-slate-100 border-none rounded-full px-5 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-merp-primary/20 transition-all"/>
          </div>
          <div className="flex items-center gap-5">
             <div className="w-9 h-9 flex items-center justify-center rounded-full bg-slate-100 text-slate-600 cursor-pointer hover:bg-slate-200">🔔</div>
          </div>
        </header>

         {/* Screen Rendering Area */}
         <div className="flex-1 overflow-auto">
            {children}
         </div>
      </main>
    </div>
  );
}

function App() {
  return (
    <Layout>
      <Routes>
        <Route path="/" element={<Dashboard />} />

        {/* Organization Masters (Phase 1.1) */}
        <Route path="/masters/companies" element={<CompanyMaster />} />
        <Route path="/masters/branches" element={<BranchMaster />} />
        <Route path="/masters/departments" element={<DepartmentMaster />} />
        <Route path="/masters/users" element={<UserMaster />} />
        <Route path="/masters/roles" element={<RoleMaster />} />

        {/* Item & Account Masters (Phase 1.3) */}
        <Route path="/masters/items" element={<ItemMaster />} />
        <Route path="/masters/accounts" element={<AccountMaster />} />
        <Route path="/masters/categories" element={<CategoryMaster />} />
        <Route path="/masters/units" element={<UnitMaster />} />
        <Route path="/masters/warehouses" element={<WarehouseMaster />} />

        {/* Transactions */}
        <Route path="/vouchers" element={<VoucherScreen />} />
        
        {/* System */}
        <Route path="/metadata" element={<div className="p-8"><h1 className="text-3xl font-extrabold tracking-tight text-slate-800 mb-4">Metadata Brain</h1><p className="text-slate-500">Under Construction...</p></div>} />
      </Routes>
    </Layout>
  );
}

export default App;

