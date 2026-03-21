'use client';

import { useState, useEffect } from 'react';
import { useSession, signOut } from 'next-auth/react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  ChevronDown, Check, Download, Filter, MapPin, 
  Receipt, Loader2, AlertCircle, ArrowRight, LogOut, Search, Calendar
} from 'lucide-react';

interface Invoice {
  id: string;
  date: string;
  amount: number;
  pickup: string;
  drop: string;
  pdfLink: string;
  selected?: boolean;
}

export default function Dashboard() {
  const { data: session } = useSession();
  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');

  // Load persisted filters
  useEffect(() => {
    const savedStart = localStorage.getItem('filter_start_date');
    const savedEnd = localStorage.getItem('filter_end_date');
    if (savedStart) setStartDate(savedStart);
    if (savedEnd) setEndDate(savedEnd);
  }, []);

  // Persist filters on change
  const handleStartChange = (val: string) => {
    setStartDate(val);
    localStorage.setItem('filter_start_date', val);
  };

  const handleEndChange = (val: string) => {
    setEndDate(val);
    localStorage.setItem('filter_end_date', val);
  };

  const fetchInvoices = async () => {
    setLoading(true);
    setError(null);
    try {
      const queryParams = new URLSearchParams({ start: startDate, end: endDate }).toString();
      const res = await fetch(`/api/scrape?${queryParams}`);
      const data = await res.json();
      
      if (res.status === 401) throw new Error('Session expired. Please Sign Out and Re-authenticate.');
      if (data.error) throw new Error(data.error);
      if (!data.invoices || data.invoices.length === 0) throw new Error('No Uber receipts found in the specified range.');
      
      setInvoices(data.invoices.map((inv: Invoice) => ({ ...inv, selected: true })));
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const toggleSelect = (id: string) => {
    setInvoices(prev => prev.map(inv => 
      inv.id === id ? { ...inv, selected: !inv.selected } : inv
    ));
  };

  return (
    <div className="premium-gradient">
      <div className="container" style={{ paddingTop: '100px', paddingBottom: '280px' }}>
        
        {/* Elite Header */}
        <header className="flex justify-between items-end dashboard-header" style={{ marginBottom: '80px' }}>
          <div>
            <div className="flex gap-4" style={{ marginBottom: '20px', flexWrap: 'wrap' }}>
              <button onClick={() => window.location.href = '/'} className="btn-secondary" style={{ padding: '8px 20px', fontSize: '0.8rem', borderRadius: '12px' }}>
                ← Home
              </button>
              <div className="badge">Portal Active</div>
            </div>
            <h1 style={{ fontSize: 'clamp(2.5rem, 5vw, 4rem)', lineHeight: 1 }}>Invoice Vault</h1>
            <p style={{ color: '#64748b', fontSize: '1.1rem', fontWeight: 500, marginTop: '8px' }}>
              Logged in as <span style={{ color: '#fff' }}>{session?.user?.email}</span>
            </p>
          </div>
          <button onClick={() => signOut({ callbackUrl: '/' })} className="btn-secondary" style={{ padding: '12px 24px', fontSize: '0.9rem' }}>
            <LogOut size={18} /> Sign Out
          </button>
        </header>

        {/* Master Control Deck */}
        <div className="panel-premium control-deck" style={{ marginBottom: '60px', padding: '40px' }}>
          <div className="flex justify-between items-center gap-12 flex-wrap-mobile">
            <div className="flex gap-6 items-center flex-wrap-mobile">
              <div className="field-group">
                <Calendar size={18} color="var(--primary)" />
                <input type="date" className="field-input" value={startDate} onChange={(e) => handleStartChange(e.target.value)} />
              </div>
              <span className="hide-mobile" style={{ fontWeight: 900, color: '#334155' }}>/</span>
              <div className="field-group">
                <Calendar size={18} color="var(--secondary)" />
                <input type="date" className="field-input" value={endDate} onChange={(e) => handleEndChange(e.target.value)} />
              </div>
            </div>

            <button onClick={fetchInvoices} className="btn-primary" style={{ minWidth: '280px' }}>
              {loading ? <Loader2 className="spin" size={24} /> : <><Search size={24} /> Sync Uber Workspace</>}
            </button>
          </div>
        </div>

        {/* Alert Zone */}
        {error && (
          <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} style={{ background: 'hsla(0, 100%, 50%, 0.1)', border: '1px solid hsla(0, 100%, 50%, 0.3)', padding: '24px', borderRadius: '24px', display: 'flex', gap: '16px', color: '#f87171', marginBottom: '48px', fontWeight: 600 }}>
            <AlertCircle /> {error}
          </motion.div>
        )}

        {/* Data Ecosystem */}
        <div style={{ width: '100%', overflowX: 'auto' }}>
          <table className="table-elite">
            <thead>
              <tr>
                <th style={{ width: '80px' }}>Select</th>
                <th>Trip Particulars</th>
                <th>Route Analytics</th>
                <th style={{ textAlign: 'right' }}>Total Amount</th>
                <th style={{ textAlign: 'right' }}>Proof</th>
              </tr>
            </thead>
            <tbody>
              {invoices.length === 0 && !loading && (
                <tr>
                  <td colSpan={5} className="text-center" style={{ padding: '120px 0' }}>
                    <div style={{ width: '100px', height: '100px', background: 'var(--surface)', borderRadius: '32px', display: 'flex', alignItems: 'center', justifySelf: 'center', justifyContent: 'center', margin: '0 auto 32px' }}>
                      <Receipt size={48} color="#334155" />
                    </div>
                    <p style={{ color: '#64748b', fontSize: '1.2rem', fontWeight: 600 }}>Awaiting workspace sync...</p>
                  </td>
                </tr>
              )}
              {invoices.map((invoice, idx) => (
                <motion.tr 
                  key={invoice.id} 
                  initial={{ opacity: 0, y: 10 }} 
                  animate={{ opacity: 1, y: 0 }} 
                  transition={{ delay: idx * 0.03 }}
                  className="row-item"
                >
                  <td className="data-table-cell" onClick={() => toggleSelect(invoice.id)}>
                    <div className={`cb-custom ${invoice.selected ? 'checked' : ''}`}>
                      {invoice.selected && <Check size={16} color="#fff" strokeWidth={3} />}
                    </div>
                  </td>
                  <td className="data-table-cell">
                    <div style={{ fontSize: '1.1rem', fontWeight: 800 }}>{invoice.date}</div>
                    <div style={{ fontSize: '0.75rem', color: '#64748b', fontWeight: 700, textTransform: 'uppercase', marginTop: '4px' }}>Verified Uber Invoice</div>
                  </td>
                  <td className="data-table-cell">
                    <div className="flex flex-column gap-2">
                      <div className="flex items-center gap-3">
                        <div style={{ width: '8px', height: '8px', background: 'var(--primary)', borderRadius: '50%' }}></div>
                        <div style={{ fontSize: '0.85rem', color: '#cbd5e1', fontWeight: 500 }}>{invoice.pickup}</div>
                      </div>
                      <div className="flex items-center gap-3">
                        <div style={{ width: '8px', height: '8px', background: 'var(--secondary)', borderRadius: '50%' }}></div>
                        <div style={{ fontSize: '0.85rem', color: '#cbd5e1', fontWeight: 500 }}>{invoice.drop}</div>
                      </div>
                    </div>
                  </td>
                  <td className="data-table-cell" style={{ textAlign: 'right' }}>
                    <div style={{ fontSize: '1.5rem', fontWeight: 900, color: 'var(--foreground)' }}>₹{invoice.amount.toFixed(2)}</div>
                  </td>
                  <td className="data-table-cell" style={{ textAlign: 'right' }}>
                    <a href={invoice.pdfLink} target="_blank" className="btn-secondary" style={{ padding: '10px 20px', fontSize: '0.8rem', borderRadius: '14px' }}>
                      View PDF
                    </a>
                  </td>
                </motion.tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* Dynamic Action Deck */}
        <AnimatePresence>
          {invoices.length > 0 && (
            <motion.div 
              initial={{ y: 200 }} animate={{ y: 0 }} exit={{ y: 200 }}
              className="deck-floating"
            >
              <div>
                <p style={{ fontSize: '0.75rem', fontWeight: 800, color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.1em' }}>Reimbursement Batch Total</p>
                <p style={{ fontSize: '2.5rem', fontWeight: 900, color: '#fff' }}>
                  ₹{invoices.filter(i => i.selected).reduce((acc, i) => acc + i.amount, 0).toFixed(2)}
                </p>
              </div>
              <button 
                className="btn-primary" 
                style={{ padding: '24px 64px', fontSize: '1.25rem' }}
                onClick={() => {
                  const selected = invoices.filter(i => i.selected);
                  localStorage.setItem('selected_invoices', JSON.stringify(selected));
                  window.location.href = '/generate';
                }}
              >
                Assemble Final Report <ArrowRight size={28} />
              </button>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}
