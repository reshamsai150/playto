import React, { useState, useEffect } from 'react';
import { LayoutDashboard, Send, History, BookOpen, Wallet, ArrowRightLeft, Plus, CheckCircle2, XCircle, Clock, AlertCircle } from 'lucide-react';

const API_BASE_URL = 'http://localhost:8000/api/v1';

const formatCurrency = (paise) => {
  return new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR' }).format(paise / 100);
};

export default function App() {
  const [activeTab, setActiveTab] = useState('dashboard');
  const [balance, setBalance] = useState({ available_balance: 0, held_balance: 0 });
  const [payouts, setPayouts] = useState([]);
  const [ledger, setLedger] = useState([]);
  const [loading, setLoading] = useState(true);
  const [lastUpdated, setLastUpdated] = useState(new Date());
  const [isRefreshing, setIsRefreshing] = useState(false);

  const fetchSummary = async () => {
    try {
      const [balRes, payRes, ledRes] = await Promise.all([
        fetch(`${API_BASE_URL}/balance/`),
        fetch(`${API_BASE_URL}/payouts/all/`),
        fetch(`${API_BASE_URL}/ledger/`)
      ]);
      
      const handleResponse = async (res) => {
        if (!res.ok) {
          const text = await res.text();
          let errorMsg = `Server error: ${res.status}`;
          try {
            const data = JSON.parse(text);
            errorMsg = data.detail || errorMsg;
          } catch (e) {
            // Not JSON
          }
          throw new Error(errorMsg);
        }
        return res.json();
      };

      const [balData, payData, ledData] = await Promise.all([
        handleResponse(balRes),
        handleResponse(payRes),
        handleResponse(ledRes)
      ]);
      
      setBalance(balData);
      setPayouts(payData.payouts || []);
      setLedger(ledData.ledger || []);
      setLastUpdated(new Date());
    } catch (error) {
      console.error("Failed to fetch data:", error);
    } finally {
      setLoading(false);
      setIsRefreshing(false);
    }
  };

  const handleManualRefresh = () => {
    setIsRefreshing(true);
    fetchSummary();
  };

  useEffect(() => {
    fetchSummary();
    const interval = setInterval(fetchSummary, 5000); // Poll every 5s
    return () => clearInterval(interval);
  }, []);

  return (
    <div className="flex h-screen bg-brand-50 font-sans">
      {/* Sidebar */}
      <aside className="w-64 bg-white border-r border-brand-200 flex flex-col">
        <div className="p-6 border-b border-brand-100 flex items-center space-x-2">
          <div className="w-8 h-8 rounded bg-accent flex items-center justify-center text-white font-bold text-xl">
            O
          </div>
          <span className="text-xl font-bold tracking-tight text-brand-900">OmniPay</span>
        </div>
        
        <nav className="flex-1 p-4 flex flex-col gap-2">
          <NavItem icon={<LayoutDashboard size={20} />} label="Dashboard" isActive={activeTab === 'dashboard'} onClick={() => setActiveTab('dashboard')} />
          <NavItem icon={<Send size={20} />} label="Request Payout" isActive={activeTab === 'request'} onClick={() => setActiveTab('request')} />
          <NavItem icon={<History size={20} />} label="Payout History" isActive={activeTab === 'history'} onClick={() => setActiveTab('history')} />
          <NavItem icon={<BookOpen size={20} />} label="Ledger" isActive={activeTab === 'ledger'} onClick={() => setActiveTab('ledger')} />
        </nav>

        <div className="p-4 border-t border-brand-100 text-sm text-brand-500">
          <p>Merchant ID: <span className="font-mono text-brand-700">MERCH_9A2X</span></p>
        </div>
      </aside>

      {/* Main Content */}
      <main className="flex-1 overflow-y-auto">
        <header className="bg-white border-b border-brand-200 px-8 py-5 flex justify-between items-center sticky top-0 z-10 shadow-sm">
          <div className="flex items-center gap-4">
            <h1 className="text-2xl font-bold text-brand-800 tracking-tight capitalize">
              {activeTab === 'request' ? 'Request Payout' : activeTab.replace('-', ' ')}
            </h1>
            <button 
              onClick={handleManualRefresh}
              disabled={isRefreshing}
              className={`p-2 rounded-full hover:bg-brand-50 text-brand-400 transition-all ${isRefreshing ? 'animate-spin text-accent' : ''}`}
              title="Refresh Data"
            >
              <ArrowRightLeft size={18} className="rotate-90" />
            </button>
          </div>
          <div className="flex items-center space-x-4">
            <div className="text-right hidden sm:block">
              <p className="text-[10px] uppercase tracking-wider font-bold text-brand-400 leading-tight">Data Last Synced</p>
              <p className="text-xs font-medium text-brand-600">{lastUpdated.toLocaleTimeString()}</p>
            </div>
            <span className="bg-green-100 text-green-700 px-3 py-1 rounded-full text-xs font-medium flex items-center gap-1">
              <span className="w-2 h-2 rounded-full bg-green-500 blur-[1px]"></span>
              System Operational
            </span>
          </div>
        </header>

        <div className="p-8 max-w-7xl mx-auto">
          {activeTab === 'dashboard' && <DashboardView balance={balance} payouts={payouts} onViewAll={() => setActiveTab('history')} />}
          {activeTab === 'request' && <RequestPayoutView balance={balance} onComplete={() => setActiveTab('history')} />}
          {activeTab === 'history' && <HistoryView payouts={payouts} />}
          {activeTab === 'ledger' && <LedgerView ledger={ledger} />}
        </div>
      </main>
    </div>
  );
}

function NavItem({ icon, label, isActive, onClick }) {
  return (
    <button
      onClick={onClick}
      className={`flex items-center space-x-3 w-full px-4 py-3 rounded-lg font-medium transition-all duration-200 ${
        isActive 
          ? 'bg-accent-light/10 text-accent-dark' 
          : 'text-brand-600 hover:bg-brand-50 hover:text-brand-900'
      }`}
    >
      {icon}
      <span>{label}</span>
    </button>
  );
}

// -------------------------------------------------------------
// VIEWS
// -------------------------------------------------------------

function DashboardView({ balance, payouts, onViewAll }) {
  return (
    <div className="space-y-6 animate-in fade-in zoom-in-95 duration-300">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="card bg-gradient-to-br from-brand-900 to-brand-800 text-white border-0 shadow-lg relative overflow-hidden">
          <div className="absolute top-0 right-0 p-6 opacity-10"><Wallet size={120} /></div>
          <div className="relative z-10">
            <h2 className="text-brand-200 font-medium mb-1">Available Balance</h2>
            <p className="text-4xl font-bold tracking-tight mb-2">{formatCurrency(balance.available_balance)}</p>
            <p className="text-sm text-brand-300 flex items-center gap-1">
              <CheckCircle2 size={16} className="text-green-400" /> Ready for withdrawal
            </p>
          </div>
        </div>

        <div className="card relative overflow-hidden shadow-sm">
          <div className="absolute top-0 right-0 p-6 opacity-5"><Clock size={120} className="text-brand-500" /></div>
          <div className="relative z-10">
            <h2 className="text-brand-500 font-medium mb-1">Held Balance</h2>
            <p className="text-4xl font-bold tracking-tight text-brand-900 mb-2">{formatCurrency(balance.held_balance)}</p>
            <p className="text-sm text-brand-500 flex items-center gap-1">
              <AlertCircle size={16} className="text-amber-500" /> Pending processing
            </p>
          </div>
        </div>
      </div>

      <div className="card">
        <div className="flex justify-between items-center mb-6">
          <h3 className="text-lg font-bold text-brand-800">Recent Activity</h3>
          <button 
            onClick={onViewAll}
            className="text-accent hover:text-accent-dark text-sm font-medium transition-colors"
          >
            View all
          </button>
        </div>
        <div className="space-y-4">
          {payouts.slice(0, 3).map(p => (
            <div key={p.id} className="flex justify-between items-center p-4 rounded-lg hover:bg-brand-50 transition-colors border border-transparent hover:border-brand-100">
              <div className="flex items-center gap-4">
                <div className={`p-2 rounded-full ${p.status === 'completed' ? 'bg-green-100 text-green-600' : 'bg-amber-100 text-amber-600'}`}>
                  {p.status === 'completed' ? <CheckCircle2 size={20} /> : <Clock size={20} />}
                </div>
                <div>
                  <p className="font-semibold text-brand-800">Payout to {p.bank_account_id || 'System'}</p>
                  <p className="text-xs text-brand-500">{new Date(p.created_at).toLocaleString()}</p>
                </div>
              </div>
              <div className="text-right">
                <p className="font-bold text-brand-900">- {formatCurrency(p.amount_paise)}</p>
                <p className="text-xs capitalize font-medium text-brand-500">{p.status}</p>
              </div>
            </div>
          ))}
          {payouts.length === 0 && <p className="text-center text-brand-500 py-4">No recent activity</p>}
        </div>
      </div>
    </div>
  );
}

function RequestPayoutView({ balance, onComplete }) {
  const [amount, setAmount] = useState('');
  const [bank, setBank] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');

  const handlePayout = async (e) => {
    e.preventDefault();
    setError('');
    
    const amtPaise = Math.round(parseFloat(amount) * 100);
    if (isNaN(amtPaise) || amtPaise <= 0) {
      setError('Please enter a valid amount.');
      return;
    }
    if (amtPaise > balance.available_balance) {
      setError('Insufficient available balance.');
      return;
    }
    if (!bank) {
      setError('Please provide a bank account reference.');
      return;
    }

    setIsLoading(true);
    try {
      const response = await fetch(`${API_BASE_URL}/payouts/`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Idempotency-Key': `idem_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
        },
        body: JSON.stringify({
          amount_paise: amtPaise,
          bank_account_id: bank
        })
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.detail || 'Failed to create payout');
      }

      onComplete();
    } catch (err) {
      setError(err.message);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="max-w-xl mx-auto mt-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
      <div className="card">
        <h2 className="text-xl font-bold text-brand-900 mb-2">Initiate Payout</h2>
        <p className="text-sm text-brand-500 mb-8">Move funds from your OmniPay balance to your registered bank account safely.</p>
        
        {error && (
          <div className="mb-6 bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg flex items-center gap-2">
            <XCircle size={18} />
            <span className="text-sm font-medium">{error}</span>
          </div>
        )}

        <form onSubmit={handlePayout} className="space-y-6">
          <div>
            <label className="block text-sm font-medium text-brand-700 mb-1">Amount (INR)</label>
            <div className="relative">
              <span className="absolute left-4 top-2.5 text-brand-400 font-medium">₹</span>
              <input 
                type="number" 
                step="0.01"
                className="input-field pl-8 font-semibold text-lg" 
                placeholder="0.00"
                value={amount}
                onChange={e => setAmount(e.target.value)}
              />
            </div>
            <p className="text-xs text-brand-500 mt-2">Available to draw: {formatCurrency(balance.available_balance)}</p>
          </div>

          <div>
            <label className="block text-sm font-medium text-brand-700 mb-1">Destination Bank Account</label>
            <select 
              className="input-field"
              value={bank}
              onChange={e => setBank(e.target.value)}
            >
              <option value="">Select a saved account</option>
              <option value="HDFC_8910">HDFC Bank **** 8910</option>
              <option value="AXIS_1122">Axis Bank **** 1122</option>
            </select>
          </div>

          <div className="pt-4">
            <button 
              type="submit" 
              disabled={isLoading}
              className="btn-primary w-full flex items-center justify-center gap-2 py-3 shadow-md hover:shadow-lg transition-shadow"
            >
              {isLoading ? (
                <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
              ) : (
                <>
                  <Send size={18} />
                  <span>Request Transfer</span>
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

function HistoryView({ payouts }) {
  const handleExport = () => {
    if (payouts.length === 0) return;
    
    const headers = ['ID', 'Date', 'Bank', 'Amount (Paise)', 'Status'];
    const csvContent = [
      headers.join(','),
      ...payouts.map(p => [
        p.id,
        new Date(p.created_at).toISOString(),
        p.bank_account_id,
        p.amount_paise,
        p.status
      ].join(','))
    ].join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.setAttribute('href', url);
    link.setAttribute('download', `payout_history_${new Date().getTime()}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const StatusBadge = ({ status }) => {
    const colors = {
      completed: 'bg-green-100 text-green-700 border-green-200',
      pending: 'bg-amber-100 text-amber-700 border-amber-200',
      processing: 'bg-blue-100 text-blue-700 border-blue-200',
      failed: 'bg-red-100 text-red-700 border-red-200'
    };
    return (
      <span className={`px-2.5 py-1 text-xs font-semibold rounded-full border ${colors[status] || colors.pending} capitalize`}>
        {status}
      </span>
    );
  };

  return (
    <div className="card p-0 overflow-hidden animate-in fade-in duration-300">
      <div className="p-6 border-b border-brand-100 bg-brand-50/50 flex justify-between items-center">
        <h2 className="text-lg font-bold text-brand-900">Payout History</h2>
        <button 
          onClick={handleExport}
          className="btn-secondary text-sm py-1.5 px-3 flex items-center gap-2"
        >
          <Plus size={14} className="rotate-45" />
          Export CSV
        </button>
      </div>
      <div className="overflow-x-auto">
        <table className="w-full">
          <thead>
            <tr>
              <th className="table-th">Payout ID</th>
              <th className="table-th">Date & Time</th>
              <th className="table-th">Bank Account</th>
              <th className="table-th text-right">Amount</th>
              <th className="table-th">Status</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-brand-100">
            {payouts.map(p => (
              <tr key={p.id} className="hover:bg-brand-50/50 transition-colors">
                <td className="table-td font-mono text-brand-900 font-medium">#{p.id}</td>
                <td className="table-td text-brand-500">{new Date(p.created_at).toLocaleString()}</td>
                <td className="table-td">{p.bank_account_id || 'System'}</td>
                <td className="table-td text-right font-semibold text-brand-900">{formatCurrency(p.amount_paise)}</td>
                <td className="table-td"><StatusBadge status={p.status} /></td>
              </tr>
            ))}
            {payouts.length === 0 && (
              <tr>
                <td colSpan="5" className="table-td text-center text-brand-500 py-8">No payout history found</td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function LedgerView({ ledger }) {
  return (
    <div className="card p-0 overflow-hidden animate-in fade-in duration-300">
      <div className="p-6 border-b border-brand-100 bg-brand-50/50">
        <h2 className="text-lg font-bold text-brand-900">Immutable Ledger</h2>
        <p className="text-sm text-brand-500">Source of truth for all fund transitions</p>
      </div>
      <div className="overflow-x-auto">
        <table className="w-full">
          <thead>
            <tr>
              <th className="table-th">Entry ID</th>
              <th className="table-th">Date</th>
              <th className="table-th">Reference</th>
              <th className="table-th">Type</th>
              <th className="table-th text-right">Amount</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-brand-100">
            {ledger.map(l => (
              <tr key={l.id} className="hover:bg-brand-50/50 transition-colors">
                <td className="table-td font-mono text-xs">{l.id}</td>
                <td className="table-td text-brand-500 text-xs">{new Date(l.created_at).toLocaleString()}</td>
                <td className="table-td font-mono text-brand-600 text-xs">{l.reference_id}</td>
                <td className="table-td">
                  <span className={`inline-flex items-center gap-1.5 font-semibold text-xs ${l.type === 'credit' ? 'text-green-600' : 'text-red-600'}`}>
                    {l.type === 'credit' ? <Plus size={14}/> : <ArrowRightLeft size={14} className="rotate-90"/>}
                    {l.type.toUpperCase()}
                  </span>
                </td>
                <td className={`table-td text-right font-bold ${l.type === 'credit' ? 'text-green-600' : 'text-red-600'}`}>
                  {l.type === 'credit' ? '+' : '-'} {formatCurrency(l.amount_paise)}
                </td>
              </tr>
            ))}
            {ledger.length === 0 && (
              <tr>
                <td colSpan="5" className="table-td text-center text-brand-500 py-8">No ledger entries found</td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
