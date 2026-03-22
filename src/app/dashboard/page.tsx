'use client';

import { useState, useEffect } from 'react';
import { useSession, signOut } from 'next-auth/react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  RiCalendarLine,
  RiSearchLine,
  RiLoader4Line,
  RiAlertLine,
  RiArrowRightLine,
  RiLogoutBoxLine,
  RiReceiptLine,
  RiArrowLeftLine,
  RiCheckLine,
  RiFilePdfLine,
  RiMapPin2Line,
  RiMapPinLine,
  RiRefreshLine,
  RiFilterLine,
} from 'react-icons/ri';
import { TbReceipt2 } from 'react-icons/tb';

import './dashboard.css';

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

  useEffect(() => {
    const savedStart = localStorage.getItem('filter_start_date');
    const savedEnd = localStorage.getItem('filter_end_date');
    if (savedStart) setStartDate(savedStart);
    if (savedEnd) setEndDate(savedEnd);
  }, []);

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

      if (res.status === 401) throw new Error('Session expired. Please sign out and re-authenticate.');
      if (data.error) throw new Error(data.error);
      if (!data.invoices || data.invoices.length === 0) throw new Error('No cab receipts found in the specified date range.');

      setInvoices(data.invoices.map((inv: Invoice) => ({ ...inv, selected: true })));
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Something went wrong');
    } finally {
      setLoading(false);
    }
  };

  const toggleSelect = (id: string) => {
    setInvoices(prev => prev.map(inv =>
      inv.id === id ? { ...inv, selected: !inv.selected } : inv
    ));
  };

  const toggleAll = () => {
    const allSelected = invoices.every(i => i.selected);
    setInvoices(prev => prev.map(inv => ({ ...inv, selected: !allSelected })));
  };

  const selectedInvoices = invoices.filter(i => i.selected);
  const selectedTotal = selectedInvoices.reduce((acc, i) => acc + i.amount, 0);

  return (
    <div className="dashboard-shell" style={{ paddingBottom: invoices.length > 0 ? '140px' : '60px' }}>

      {/* ── Top Nav ─────────────────────────────────────── */}
      <nav className="dashboard-nav">
        <div className="container" style={{ paddingTop: 0, paddingBottom: 0 }}>
          <div className="flex items-center justify-between" style={{ height: '64px' }}>
            <div className="flex items-center gap-4">
              <button
                onClick={() => window.location.href = '/'}
                className="btn-dashboard btn-ghost-dark"
                style={{ padding: '8px 14px' }}
              >
                <RiArrowLeftLine size={16} /> <span className="mobile-hide">Home</span>
              </button>
              <div className="mobile-hide" style={{ height: 24, width: 1, background: 'var(--l-border, rgba(255,255,255,0.06))' }} />
              <div className="flex items-center gap-3">
                <div style={{
                  width: 32, height: 32,
                  background: 'var(--l-accent-strong, #6366F1)',
                  borderRadius: 8,
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  boxShadow: '0 0 16px rgba(99, 102, 241, 0.4)'
                }}>
                  <TbReceipt2 size={18} color="#fff" />
                </div>
                <span className="mobile-hide" style={{ fontFamily: 'Libre Baskerville, serif', fontWeight: 700, fontSize: '1.1rem', color: 'var(--l-text, #FAFAFA)', letterSpacing: '-0.02em' }}>
                  CabReimburse
                </span>
              </div>
            </div>

            <div className="flex items-center gap-4">
              {session?.user?.email && (
                <span className="mobile-hide" style={{ fontSize: '0.85rem', color: 'var(--l-text-3, #71717A)', fontWeight: 500 }}>
                  {session.user.email}
                </span>
              )}
              <button
                onClick={() => signOut({ callbackUrl: '/' })}
                className="btn-dashboard btn-ghost-dark"
                style={{ padding: '8px 14px' }}
              >
                <RiLogoutBoxLine size={16} />
                <span className="mobile-hide">Sign out</span>
              </button>
            </div>
          </div>
        </div>
      </nav>

      {/* ── Page Content ────────────────────────────────── */}
      <div className="container" style={{ paddingTop: 48, paddingBottom: 24 }}>

        {/* Page Header */}
        <div style={{ marginBottom: 40 }}>
          <h1 className="dashboard-title">
            Your expense receipts
          </h1>
          <p className="dashboard-sub">
            Set a date range and sync your Gmail to pull cab receipts automatically.
          </p>
        </div>

        {/* ── Filter & Sync Panel ──────────────────────── */}
        <div className="dashboard-card" style={{ marginBottom: 32 }}>
          <div className="flex items-center gap-4 flex-wrap mobile-col">
            {/* Start Date */}
            <div style={{ flex: 1, minWidth: 180 }}>
              <div className="field-wrap">
                <RiCalendarLine size={18} />
                <input
                  type="date"
                  className="field-input"
                  value={startDate}
                  onChange={e => handleStartChange(e.target.value)}
                />
              </div>
            </div>

            <div className="mobile-hide" style={{ color: 'var(--l-text-3, #71717A)', fontWeight: 500 }}>→</div>

            {/* End Date */}
            <div style={{ flex: 1, minWidth: 180 }}>
              <div className="field-wrap">
                <RiCalendarLine size={18} />
                <input
                  type="date"
                  className="field-input"
                  value={endDate}
                  onChange={e => handleEndChange(e.target.value)}
                />
              </div>
            </div>

            {/* Sync Button */}
            <div style={{ flex: '0 0 auto', width: '100%', maxWidth: 280 }} className="mobile-full">
              <button
                onClick={fetchInvoices}
                disabled={loading}
                className="btn-dashboard btn-primary-dark w-full"
                style={{ width: '100%', height: 48 }}
              >
                {loading ? (
                  <><RiLoader4Line size={20} className="spin" /> Syncing Gmail…</>
                ) : (
                  <><RiSearchLine size={18} /> Sync Receipts</>
                )}
              </button>
            </div>
          </div>
        </div>

        {/* ── Error Alert ──────────────────────────────── */}
        <AnimatePresence>
          {error && (
            <motion.div
              initial={{ opacity: 0, y: -8 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0 }}
              className="alert-error"
              style={{ marginBottom: 24 }}
            >
              <RiAlertLine size={20} style={{ flexShrink: 0, marginTop: 1 }} />
              <span>{error}</span>
            </motion.div>
          )}
        </AnimatePresence>

        {/* ── Invoices Table ───────────────────────────── */}
        <div className="data-table-wrapper">
          {loading ? (
            /* Skeleton Loader */
            <table className="data-table">
              <thead>
                <tr>
                  <th style={{ width: 64, paddingLeft: 24 }}></th>
                  <th>Date</th>
                  <th>Route</th>
                  <th>Platform</th>
                  <th style={{ textAlign: 'right' }}>Amount</th>
                  <th style={{ textAlign: 'right', paddingRight: 24 }}>Receipt</th>
                </tr>
              </thead>
              <tbody>
                {[1, 2, 3, 4, 5].map((i) => (
                  <tr key={i}>
                    <td style={{ paddingLeft: 24, width: 64 }}>
                      <div className="skeleton skeleton-checkbox" />
                    </td>
                    <td>
                      <div className="skeleton skeleton-text" style={{ width: '80px' }} />
                    </td>
                    <td>
                      <div className="skeleton skeleton-text" style={{ width: '200px' }} />
                    </td>
                    <td>
                      <div className="skeleton skeleton-badge" />
                    </td>
                    <td style={{ textAlign: 'right' }}>
                      <div className="skeleton skeleton-text" style={{ width: '60px', marginLeft: 'auto' }} />
                    </td>
                    <td style={{ textAlign: 'right', paddingRight: 24 }}>
                      <div className="skeleton skeleton-badge" style={{ marginLeft: 'auto' }} />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          ) : invoices.length === 0 ? (
            /* Empty State */
            <div style={{ padding: '80px 32px', textAlign: 'center' }}>
              <div style={{
                width: 80, height: 80,
                background: 'rgba(255, 255, 255, 0.03)',
                borderRadius: 24,
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                margin: '0 auto 24px',
                border: '1px solid var(--l-border, rgba(255, 255, 255, 0.06))',
              }}>
                <RiReceiptLine size={36} color="var(--l-text-3, #71717A)" />
              </div>
              <h3 style={{ fontFamily: 'Libre Baskerville, serif', fontSize: '1.4rem', marginBottom: 12, color: 'var(--l-text, #FAFAFA)' }}>
                No receipts yet
              </h3>
              <p style={{ color: 'var(--l-text-2, #A1A1AA)', fontSize: '0.95rem', maxWidth: 360, margin: '0 auto', lineHeight: 1.6 }}>
                Set a date range above and hit <strong>Sync Receipts</strong> to securely fetch your latest cab invoices.
              </p>
            </div>
          ) : (
            <>
              {/* Table Header with Select All */}
              {invoices.length > 0 && (
                <div className="flex items-center justify-between" style={{ padding: '20px 24px', borderBottom: '1px solid var(--l-border, rgba(255,255,255,0.06))', background: 'rgba(0,0,0,0.2)' }}>
                  <div className="flex items-center gap-4">
                    <div
                      className={`checkbox ${invoices.every(i => i.selected) ? 'checked' : ''}`}
                      onClick={toggleAll}
                    >
                      {invoices.every(i => i.selected) && <RiCheckLine size={14} color="#fff" strokeWidth={1} />}
                    </div>
                    <span style={{ fontSize: '0.85rem', fontWeight: 600, color: 'var(--l-text-2, #A1A1AA)' }}>
                      {selectedInvoices.length} of {invoices.length} selected
                    </span>
                  </div>
                  {invoices.length > 0 && (
                    <button onClick={fetchInvoices} className="btn-dashboard btn-ghost-dark" style={{ padding: '6px 14px', fontSize: '0.85rem' }}>
                      <RiRefreshLine size={14} /> Refresh
                    </button>
                  )}
                </div>
              )}

              {/* Table */}
              <table className="data-table">
                <thead>
                  <tr>
                    <th style={{ width: 64, paddingLeft: 24 }}></th>
                    <th>Date</th>
                    <th>Route</th>
                    <th>Platform</th>
                    <th style={{ textAlign: 'right' }}>Amount</th>
                    <th style={{ textAlign: 'right', paddingRight: 24 }}>Receipt</th>
                  </tr>
                </thead>
                <tbody>
                  {invoices.map((invoice, idx) => (
                    <motion.tr
                      key={invoice.id}
                      initial={{ opacity: 0, y: 6 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: idx * 0.025, duration: 0.3 }}
                      onClick={() => toggleSelect(invoice.id)}
                      style={{ cursor: 'pointer' }}
                    >
                      <td data-label="" style={{ paddingLeft: 24, width: 64 }}>
                        <div
                          className={`checkbox ${invoice.selected ? 'checked' : ''}`}
                          style={{ margin: '0' }}
                        >
                          {invoice.selected && <RiCheckLine size={14} color="#fff" />}
                        </div>
                      </td>

                      <td data-label="Date">
                        <div style={{ fontWeight: 700, color: 'var(--l-text, #FAFAFA)', fontSize: '1.05rem', letterSpacing: '-0.01em' }}>
                          {invoice.date.split(',')[0]}
                        </div>
                      </td>

                      <td data-label="Route" onClick={e => e.stopPropagation()}>
                        <div style={{ fontSize: '0.95rem', color: 'var(--l-text-2, #A1A1AA)' }} className="truncate">
                          {invoice.pickup} &rarr; {invoice.drop}
                        </div>
                      </td>

                      <td data-label="Platform" onClick={e => e.stopPropagation()}>
                        <span className="platform-badge platform-badge-uber">Uber</span>
                      </td>

                      <td data-label="Amount" style={{ textAlign: 'right' }} onClick={e => e.stopPropagation()}>
                        <span style={{
                          fontFamily: 'Nunito Sans, sans-serif',
                          fontSize: '1.05rem',
                          fontWeight: 700,
                          color: 'var(--l-emerald, #34D399)',
                        }}>
                          ₹{invoice.amount.toFixed(2)}
                        </span>
                      </td>

                      <td data-label="Receipt" style={{ textAlign: 'right', paddingRight: 24 }} onClick={e => e.stopPropagation()}>
                        <a
                          href={invoice.pdfLink}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="btn-dashboard btn-ghost-dark"
                          style={{ padding: '8px 16px', fontSize: '0.85rem' }}
                        >
                          <RiFilePdfLine size={15} /> PDF
                        </a>
                      </td>
                    </motion.tr>
                  ))}
                </tbody>
              </table>
            </>
          )}
        </div>
      </div>


      {/* ── Floating Action Bar ──────────────────────────── */}
      <AnimatePresence>
        {invoices.length > 0 && (
          <motion.div
            initial={{ y: 120, opacity: 0, x: '-50%' }}
            animate={{ y: 0, opacity: 1, x: '-50%' }}
            exit={{ y: 120, opacity: 0, x: '-50%' }}
            transition={{ type: 'spring', stiffness: 380, damping: 32 }}
            className="action-bar"
          >
            <div>
              <div className="total-label">Reimbursement total</div>
              <div className="total-amount">
                ₹{selectedTotal.toFixed(2)}
              </div>
              {selectedInvoices.length !== invoices.length && (
                <div style={{ fontSize: '0.75rem', color: 'var(--l-text-3, #71717A)', marginTop: 4, fontWeight: 500 }}>
                  {selectedInvoices.length} of {invoices.length} trips
                </div>
              )}
            </div>

            <button
              className="btn-dashboard btn-primary-dark"
              disabled={selectedInvoices.length === 0}
              style={{ padding: '14px 28px', fontSize: '1.05rem' }}
              onClick={() => {
                localStorage.setItem('selected_invoices', JSON.stringify(selectedInvoices));
                window.location.href = '/generate';
              }}
            >
              Build Report <RiArrowRightLine size={18} />
            </button>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
