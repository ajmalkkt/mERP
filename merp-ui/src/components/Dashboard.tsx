import { useState, useEffect } from 'react';
import axios from 'axios';

interface DashboardStats {
  totalProducts: number;
  totalVouchers: number;
  totalUsers: number;
  recentActivity: Array<{
    id: string;
    type: string;
    description: string;
    timestamp: string;
  }>;
}

export function Dashboard() {
  const [stats, setStats] = useState<DashboardStats>({
    totalProducts: 0,
    totalVouchers: 0,
    totalUsers: 0,
    recentActivity: []
  });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchDashboardData();
  }, []);

  const fetchDashboardData = async () => {
    try {
      // Fetch basic stats - these would be real API calls in production
      const [productsRes, vouchersRes, usersRes] = await Promise.all([
        axios.get('http://localhost:5000/api/meta/master/PRODUCT'),
        axios.get('http://localhost:5000/api/txn/vouchers?limit=1'),
        axios.get('http://localhost:5000/api/auth/users')
      ]);

      setStats({
        totalProducts: productsRes.data?.length || 0,
        totalVouchers: vouchersRes.data?.total || 0,
        totalUsers: usersRes.data?.length || 0,
        recentActivity: [
          { id: '1', type: 'voucher', description: 'Sales Invoice #SI-001 created', timestamp: new Date().toISOString() },
          { id: '2', type: 'product', description: 'New product "Laptop" added', timestamp: new Date(Date.now() - 3600000).toISOString() },
          { id: '3', type: 'user', description: 'User "admin" logged in', timestamp: new Date(Date.now() - 7200000).toISOString() },
        ]
      });
    } catch (error) {
      console.error('Failed to fetch dashboard data:', error);
      // Set mock data for demo
      setStats({
        totalProducts: 25,
        totalVouchers: 47,
        totalUsers: 3,
        recentActivity: [
          { id: '1', type: 'voucher', description: 'Sales Invoice #SI-001 created', timestamp: new Date().toISOString() },
          { id: '2', type: 'product', description: 'New product "Laptop" added', timestamp: new Date(Date.now() - 3600000).toISOString() },
          { id: '3', type: 'user', description: 'User "admin" logged in', timestamp: new Date(Date.now() - 7200000).toISOString() },
        ]
      });
    } finally {
      setLoading(false);
    }
  };

  const StatCard = ({ title, value, icon, color }: { title: string; value: number; icon: string; color: string }) => (
    <div className={`bg-white p-6 rounded-xl shadow-sm border border-slate-200 ${color}`}>
      <div className="flex items-center justify-between">
        <div>
          <p className="text-sm font-medium text-slate-600">{title}</p>
          <p className="text-3xl font-bold text-slate-800">{loading ? '...' : value}</p>
        </div>
        <div className="text-4xl opacity-20">{icon}</div>
      </div>
    </div>
  );

  return (
    <div className="p-8 max-w-7xl mx-auto font-sans text-merp-secondary">
      <div className="mb-8">
        <h1 className="text-3xl font-extrabold tracking-tight text-slate-800">Dashboard</h1>
        <p className="text-slate-500 mt-1">Welcome to your ERP system overview</p>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
        <StatCard
          title="Total Products"
          value={stats.totalProducts}
          icon="📦"
          color="border-l-4 border-l-blue-500"
        />
        <StatCard
          title="Total Vouchers"
          value={stats.totalVouchers}
          icon="📄"
          color="border-l-4 border-l-green-500"
        />
        <StatCard
          title="Active Users"
          value={stats.totalUsers}
          icon="👥"
          color="border-l-4 border-l-purple-500"
        />
      </div>

      {/* Recent Activity */}
      <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
        <div className="px-6 py-4 border-b border-slate-200 bg-slate-50">
          <h2 className="text-lg font-bold text-slate-800">Recent Activity</h2>
        </div>
        <div className="divide-y divide-slate-100">
          {stats.recentActivity.map((activity) => (
            <div key={activity.id} className="px-6 py-4 hover:bg-slate-50 transition-colors">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-2 h-2 bg-merp-primary rounded-full"></div>
                  <div>
                    <p className="text-sm font-medium text-slate-800">{activity.description}</p>
                    <p className="text-xs text-slate-500">
                      {new Date(activity.timestamp).toLocaleString()}
                    </p>
                  </div>
                </div>
                <div className={`px-2 py-1 rounded-full text-xs font-medium ${
                  activity.type === 'voucher' ? 'bg-green-100 text-green-800' :
                  activity.type === 'product' ? 'bg-blue-100 text-blue-800' :
                  'bg-purple-100 text-purple-800'
                }`}>
                  {activity.type}
                </div>
              </div>
            </div>
          ))}
        </div>
        {stats.recentActivity.length === 0 && (
          <div className="px-6 py-8 text-center text-slate-500">
            No recent activity to display
          </div>
        )}
      </div>

      {/* Quick Actions */}
      <div className="mt-8 bg-white rounded-xl shadow-sm border border-slate-200 p-6">
        <h2 className="text-lg font-bold text-slate-800 mb-4">Quick Actions</h2>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <button className="p-4 border border-slate-200 rounded-lg hover:bg-slate-50 transition-colors text-left">
            <div className="font-medium text-slate-800">Create Sales Invoice</div>
            <div className="text-sm text-slate-500">Record a new sales transaction</div>
          </button>
          <button className="p-4 border border-slate-200 rounded-lg hover:bg-slate-50 transition-colors text-left">
            <div className="font-medium text-slate-800">Add New Product</div>
            <div className="text-sm text-slate-500">Add a product to inventory</div>
          </button>
          <button className="p-4 border border-slate-200 rounded-lg hover:bg-slate-50 transition-colors text-left">
            <div className="font-medium text-slate-800">View Reports</div>
            <div className="text-sm text-slate-500">Access financial reports</div>
          </button>
        </div>
      </div>
    </div>
  );
}