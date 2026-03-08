import React, { useState, useEffect } from 'react';
import { useTheme } from '../context/ThemeContext';
import { Activity, Users, Database, Server, ShieldAlert, LogOut } from 'lucide-react';

const AdminPage = () => {
  const { isDarkMode } = useTheme();
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [passwordInput, setPasswordInput] = useState('');
  const [error, setError] = useState('');

  // Use an environment variable or a fallback password
  const ADMIN_PASSWORD = import.meta.env.VITE_ADMIN_PASSWORD || 'admin123';

  useEffect(() => {
    // Check local storage for session
    const session = localStorage.getItem('admin_session');
    if (session === 'active') {
      setIsAuthenticated(true);
    }
  }, []);

  const handleLogin = (e) => {
    e.preventDefault();
    if (passwordInput === ADMIN_PASSWORD) {
      setIsAuthenticated(true);
      localStorage.setItem('admin_session', 'active');
      setError('');
    } else {
      setError('Incorrect password');
      setPasswordInput('');
    }
  };

  const handleLogout = () => {
    setIsAuthenticated(false);
    localStorage.removeItem('admin_session');
    setPasswordInput('');
  };

  // UI styles referencing the app's glassmorphism aesthetic
  const containerClass = `min-h-screen pt-24 pb-12 px-6 sm:px-12 lg:px-24 transition-colors duration-500`;
  const glassCardClass = `backdrop-blur-xl border rounded-3xl p-8 shadow-2xl transition-all duration-300 ${isDarkMode
      ? 'bg-slate-900/60 border-slate-700/50 text-slate-100 shadow-cyan-900/10'
      : 'bg-white/60 border-white/50 text-slate-800 shadow-sky-900/5'
    }`;
  const inputClass = `w-full px-4 py-3 rounded-xl border focus:outline-none focus:ring-2 transition-all ${isDarkMode
      ? 'bg-slate-800/50 border-slate-700 text-white focus:ring-cyan-500 focus:border-transparent placeholder-slate-400'
      : 'bg-white/70 border-slate-200 text-slate-900 focus:ring-sky-500 focus:border-transparent placeholder-slate-500'
    }`;
  const buttonClass = `w-full py-3 px-6 rounded-xl font-bold tracking-wide transition-all duration-300 shadow-lg hover:shadow-xl transform hover:-translate-y-0.5 ${isDarkMode
      ? 'bg-gradient-to-r from-cyan-600 to-blue-600 text-white hover:from-cyan-500 hover:to-blue-500 shadow-cyan-900/30'
      : 'bg-gradient-to-r from-sky-500 to-indigo-500 text-white hover:from-sky-400 hover:to-indigo-400 shadow-sky-500/30'
    }`;

  if (!isAuthenticated) {
    return (
      <div className={containerClass}>
        <div className="max-w-md mx-auto mt-20">
          <div className={glassCardClass}>
            <div className="flex flex-col items-center mb-8">
              <div className={`p-4 rounded-full mb-4 ${isDarkMode ? 'bg-red-500/20 text-red-400' : 'bg-red-100 text-red-600'}`}>
                <ShieldAlert size={32} />
              </div>
              <h1 className="text-2xl font-bold text-center">Restricted Access</h1>
              <p className={`text-sm mt-2 text-center ${isDarkMode ? 'text-slate-400' : 'text-slate-500'}`}>
                Please enter the administrator password to continue.
              </p>
            </div>

            <form onSubmit={handleLogin} className="space-y-6">
              <div>
                <input
                  type="password"
                  value={passwordInput}
                  onChange={(e) => setPasswordInput(e.target.value)}
                  placeholder="Admin Password"
                  className={inputClass}
                  autoFocus
                />
                {error && <p className="text-red-500 text-sm mt-2 ml-1">{error}</p>}
              </div>
              <button type="submit" className={buttonClass}>
                Access Dashboard
              </button>
            </form>
          </div>
        </div>
      </div>
    );
  }

  // Mock Admin Dashboard Data
  const stats = [
    { label: 'Total Trips Planned', value: '1,248', icon: <Activity size={24} />, color: 'text-emerald-500', bg: 'bg-emerald-500/10' },
    { label: 'Active Users', value: '342', icon: <Users size={24} />, color: 'text-blue-500', bg: 'bg-blue-500/10' },
    { label: 'Server Load', value: '24%', icon: <Server size={24} />, color: 'text-amber-500', bg: 'bg-amber-500/10' },
    { label: 'Database Size', value: '4.2 GB', icon: <Database size={24} />, color: 'text-purple-500', bg: 'bg-purple-500/10' },
  ];

  return (
    <div className={containerClass}>
      <div className="max-w-6xl mx-auto space-y-8">
        
        {/* Header */}
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
          <div>
            <h1 className="text-4xl font-black font-display tracking-tight bg-clip-text text-transparent bg-gradient-to-r from-cyan-500 to-blue-600">
              Admin Dashboard
            </h1>
            <p className={`mt-2 ${isDarkMode ? 'text-slate-400' : 'text-slate-600'}`}>
              System overview and metrics.
            </p>
          </div>
          <button
            onClick={handleLogout}
            className={`flex items-center gap-2 px-4 py-2 rounded-lg font-medium transition-all ${
              isDarkMode 
                ? 'bg-slate-800 text-slate-300 hover:bg-slate-700 hover:text-white' 
                : 'bg-white/50 text-slate-600 hover:bg-white hover:text-slate-900 border border-slate-200'
            }`}
          >
            <LogOut size={18} />
            Logout
          </button>
        </div>

        {/* Stats Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          {stats.map((stat, idx) => (
            <div key={idx} className={glassCardClass}>
              <div className="flex items-center gap-4">
                <div className={`p-3 rounded-2xl ${stat.bg} ${stat.color}`}>
                  {stat.icon}
                </div>
                <div>
                  <p className={`text-sm font-medium ${isDarkMode ? 'text-slate-400' : 'text-slate-500'}`}>
                    {stat.label}
                  </p>
                  <p className="text-2xl font-bold mt-1">{stat.value}</p>
                </div>
              </div>
            </div>
          ))}
        </div>

        {/* Recent Activity Mock Table */}
        <div className={glassCardClass}>
          <h2 className="text-xl font-bold mb-6">Recent System Activity</h2>
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className={`border-b ${isDarkMode ? 'border-slate-800 text-slate-400' : 'border-slate-200 text-slate-500'}`}>
                  <th className="pb-3 px-4 font-medium">Timestamp</th>
                  <th className="pb-3 px-4 font-medium">Event Type</th>
                  <th className="pb-3 px-4 font-medium">Details</th>
                  <th className="pb-3 px-4 font-medium">Status</th>
                </tr>
              </thead>
              <tbody className={`divide-y ${isDarkMode ? 'divide-slate-800/50' : 'divide-slate-200/50'}`}>
                {[
                  { time: '10:42 AM', type: 'API Request', detail: 'Generate Itinerary (Tokyo)', status: 'Success' },
                  { time: '10:38 AM', type: 'Database', detail: 'Cache cleanup task run', status: 'Success' },
                  { time: '10:15 AM', type: 'User Auth', detail: 'Failed admin login attempt', status: 'Warning' },
                  { time: '09:55 AM', type: 'System', detail: 'Server startup sequence', status: 'Success' },
                ].map((row, idx) => (
                  <tr key={idx} className={`transition-colors ${isDarkMode ? 'hover:bg-slate-800/30' : 'hover:bg-slate-50/50'}`}>
                    <td className="py-4 px-4 whitespace-nowrap">{row.time}</td>
                    <td className="py-4 px-4 font-medium">{row.type}</td>
                    <td className="py-4 px-4">{row.detail}</td>
                    <td className="py-4 px-4">
                      <span className={`px-2 py-1 text-xs rounded-full ${
                        row.status === 'Success' 
                          ? isDarkMode ? 'bg-emerald-500/20 text-emerald-400' : 'bg-emerald-100 text-emerald-600'
                          : isDarkMode ? 'bg-amber-500/20 text-amber-400' : 'bg-amber-100 text-amber-600'
                      }`}>
                        {row.status}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

      </div>
    </div>
  );
};

export default AdminPage;
