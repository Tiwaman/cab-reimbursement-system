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
      if (!data.invoices || data.invoices.length === 0) throw new Error('No Uber receipts found in the specified date range.');

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
    <div className="page-shell" style={{ paddingBottom: invoices.length > 0 ? '140px' : '60px' }}>

      {/* ── Top Nav ─────────────────────────────────────── */}
      <nav style={{
        position: 'sticky', top: 0, zIndex: 50,
        background: 'rgba(249, 247, 243, 0.92)',
        backdropFilter: 'blur(12px)',
        borderBottom: '1px solid var(--border)',
      }}>
        <div className="container" style={{ paddingTop: 0, paddingBottom: 0 }}>
          <div className="flex items-center justify-between" style={{ height: '60px' }}>
            <div className="flex items-center gap-4">
              <button
                onClick={() => window.location.href = '/'}
                className="btn btn-ghost btn-sm"
                style={{ padding: '8px 14px' }}
              >
                <RiArrowLeftLine size={15} /> Home
              </button>
              <div className="mobile-hide" style={{ height: 20, width: 1, background: 'var(--border)' }} />
              <div className="flex items-center gap-2 mobile-hide">
                <div style={{
                  width: 28, height: 28,
                  background: 'var(--orange)',
                  borderRadius: 7,
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                }}>
                  <TbReceipt2 size={15} color="#fff" />
                </div>
                <span style={{ fontFamily: 'Fraunces, serif', fontWeight: 700, fontSize: '0.95rem', color: 'var(--ink)' }}>
                  CabReimburse
                </span>
              </div>
            </div>

            <div className="flex items-center gap-3">
              {session?.user?.email && (
                <span className="mobile-hide" style={{ fontSize: '0.8rem', color: 'var(--ink-3)', fontWeight: 500 }}>
                  {session.user.email}
                </span>
              )}
              <button
                onClick={() => signOut({ callbackUrl: '/' })}
                className="btn btn-ghost btn-sm"
              >
                <RiLogoutBoxLine size={15} />
                <span className="mobile-hide">Sign out</span>
              </button>
            </div>
          </div>
        </div>
      </nav>

      {/* ── Page Content ────────────────────────────────── */}
      <div className="container" style={{ paddingTop: 48, paddingBottom: 24 }}>

        {/* Page Header */}
        <div style={{ marginBottom: 36 }}>
          <div className="flex items-center gap-3" style={{ marginBottom: 8 }}>
            <span className="badge badge-orange">
              <RiReceiptLine size={11} /> Invoice Vault
            </span>
            {invoices.length > 0 && (
              <span className="badge badge-ink">
                {invoices.length} trips
              </span>
            )}
          </div>
          <h1 style={{ fontSize: 'clamp(2rem, 5vw, 3.2rem)', marginBottom: 8 }}>
            Your expense receipts
          </h1>
          <p style={{ color: 'var(--ink-2)', fontSize: '0.95rem' }}>
            Set a date range and sync your Gmail to pull Uber receipts.
          </p>
        </div>

        {/* ── Filter & Sync Panel ──────────────────────── */}
        <div className="card card-padded" style={{ marginBottom: 24 }}>
          <div className="flex items-center gap-3" style={{ marginBottom: 20 }}>
            <RiFilterLine size={16} color="var(--ink-3)" />
            <span style={{ fontSize: '0.82rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.08em', color: 'var(--ink-3)' }}>
              Date Range
            </span>
          </div>

          <div className="flex items-center gap-4 flex-wrap mobile-col">
            {/* Start Date */}
            <div style={{ flex: 1, minWidth: 180 }}>
              <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: 600, color: 'var(--ink-3)', marginBottom: 8, textTransform: 'uppercase', letterSpacing: '0.06em' }}>
                From
              </label>
              <div className="field-wrap">
                <RiCalendarLine size={17} />
                <input
                  type="date"
                  className="field-input"
                  value={startDate}
                  onChange={e => handleStartChange(e.target.value)}
                />
              </div>
            </div>

            <div className="mobile-hide" style={{ paddingTop: 28, color: 'var(--ink-3)', fontWeight: 500 }}>→</div>

            {/* End Date */}
            <div style={{ flex: 1, minWidth: 180 }}>
              <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: 600, color: 'var(--ink-3)', marginBottom: 8, textTransform: 'uppercase', letterSpacing: '0.06em' }}>
                To
              </label>
              <div className="field-wrap">
                <RiCalendarLine size={17} />
                <input
                  type="date"
                  className="field-input"
                  value={endDate}
                  onChange={e => handleEndChange(e.target.value)}
                />
              </div>
            </div>

            {/* Sync Button */}
            <div style={{ paddingTop: 30, flex: '0 0 auto', width: '100%', maxWidth: 260 }} className="mobile-full">
              <button
                onClick={fetchInvoices}
                disabled={loading}
                className="btn btn-orange w-full"
                style={{ width: '100%', height: 48, fontSize: '0.95rem' }}
              >
                {loading ? (
                  <><RiLoader4Line size={18} className="spin" /> Syncing Gmail…</>
                ) : (
                  <><RiSearchLine size={17} /> Sync Uber Receipts</>
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
              style={{ marginBottom: 20 }}
            >
              <RiAlertLine size={18} style={{ flexShrink: 0, marginTop: 2 }} />
              <span>{error}</span>
            </motion.div>
          )}
        </AnimatePresence>

        {/* ── Invoices Table ───────────────────────────── */}
        <div className="card" style={{ overflow: 'hidden' }}>
          {invoices.length === 0 && !loading ? (
            /* Empty State */
            <div style={{ padding: '80px 32px', textAlign: 'center' }}>
              <div style={{
                width: 72, height: 72,
                background: 'var(--bg-alt)',
                borderRadius: 20,
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                margin: '0 auto 20px',
                border: '1px solid var(--border)',
              }}>
                <RiReceiptLine size={32} color="var(--ink-3)" />
              </div>
              <h3 style={{ fontFamily: 'Fraunces, serif', fontSize: '1.3rem', marginBottom: 8 }}>
                No receipts yet
              </h3>
              <p style={{ color: 'var(--ink-2)', fontSize: '0.9rem', maxWidth: 320, margin: '0 auto' }}>
                Set a date range above and hit <strong>Sync Uber Receipts</strong> to fetch your Gmail inbox.
              </p>
            </div>
          ) : (
            <>
              {/* Table Header with Select All */}
              {invoices.length > 0 && (
                <div className="flex items-center justify-between" style={{ padding: '16px 20px', borderBottom: '1px solid var(--border)' }}>
                  <div className="flex items-center gap-3">
                    <div
                      className={`checkbox ${invoices.every(i => i.selected) ? 'checked' : ''}`}
                      onClick={toggleAll}
                    >
                      {invoices.every(i => i.selected) && <RiCheckLine size={13} color="#fff" strokeWidth={1} />}
                    </div>
                    <span style={{ fontSize: '0.82rem', fontWeight: 600, color: 'var(--ink-2)' }}>
                      {selectedInvoices.length} of {invoices.length} selected
                    </span>
                  </div>
                  {invoices.length > 0 && (
                    <button onClick={fetchInvoices} className="btn btn-ghost btn-sm" style={{ gap: 6 }}>
                      <RiRefreshLine size={13} /> Refresh
                    </button>
                  )}
                </div>
              )}

              {/* Table */}
              <div style={{ overflowX: 'auto' }}>
                <table className="data-table">
                  <thead>
                    <tr>
                      <th style={{ width: 52 }}></th>
                      <th>Date</th>
                      <th>Route</th>
                      <th style={{ textAlign: 'right' }}>Amount</th>
                      <th style={{ textAlign: 'right' }}>Receipt</th>
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
                        <td data-label="" style={{ paddingRight: 0 }}>
                          <div
                            className={`checkbox ${invoice.selected ? 'checked' : ''}`}
                            style={{ margin: '0 auto' }}
                          >
                            {invoice.selected && <RiCheckLine size={13} color="#fff" />}
                          </div>
                        </td>

                        <td data-label="Date">
                          <div style={{ fontWeight: 600, color: 'var(--ink)', fontSize: '0.9rem' }}>
                            {invoice.date}
                          </div>
                          <div style={{ fontSize: '0.72rem', color: 'var(--ink-3)', marginTop: 2, fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                            Uber India
                          </div>
                        </td>

                        <td data-label="Route" onClick={e => e.stopPropagation()}>
                          <div className="flex flex-col gap-1" style={{ minWidth: 200 }}>
                            <div className="flex items-center gap-2">
                              <RiMapPin2Line size={13} color="var(--orange)" style={{ flexShrink: 0 }} />
                              <span style={{ fontSize: '0.83rem', color: 'var(--ink-2)', lineHeight: 1.3 }} className="truncate" title={invoice.pickup}>
                                {invoice.pickup}
                              </span>
                            </div>
                            <div className="route-line" style={{ marginLeft: 4 }} />
                            <div className="flex items-center gap-2">
                              <RiMapPinLine size={13} color="var(--green)" style={{ flexShrink: 0 }} />
                              <span style={{ fontSize: '0.83rem', color: 'var(--ink-2)', lineHeight: 1.3 }} className="truncate" title={invoice.drop}>
                                {invoice.drop}
                              </span>
                            </div>
                          </div>
                        </td>

                        <td data-label="Amount" style={{ textAlign: 'right' }} onClick={e => e.stopPropagation()}>
                          <span style={{
                            fontFamily: 'Fraunces, serif',
                            fontSize: '1.2rem',
                            fontWeight: 700,
                            color: 'var(--ink)',
                            letterSpacing: '-0.02em',
                          }}>
                            ₹{invoice.amount.toFixed(2)}
                          </span>
                        </td>

                        <td data-label="Receipt" style={{ textAlign: 'right' }} onClick={e => e.stopPropagation()}>
                          <a
                            href={invoice.pdfLink}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="btn btn-ghost btn-sm"
                            style={{ display: 'inline-flex' }}
                          >
                            <RiFilePdfLine size={14} /> PDF
                          </a>
                        </td>
                      </motion.tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </>
          )}
        </div>
      </div>

      {/* ── Floating Action Bar ──────────────────────────── */}
      <AnimatePresence>
        {invoices.length > 0 && (
          <motion.div
            initial={{ y: 120, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            exit={{ y: 120, opacity: 0 }}
            transition={{ type: 'spring', stiffness: 380, damping: 32 }}
            className="action-bar"
          >
            <div>
              <div className="total-label">Reimbursement total</div>
              <div className="total-amount">
                ₹{selectedTotal.toFixed(2)}
              </div>
              {selectedInvoices.length !== invoices.length && (
                <div style={{ fontSize: '0.72rem', color: 'rgba(255,255,255,0.4)', marginTop: 2 }}>
                  {selectedInvoices.length} of {invoices.length} trips
                </div>
              )}
            </div>

            <button
              className="btn-action"
              disabled={selectedInvoices.length === 0}
              style={{ opacity: selectedInvoices.length === 0 ? 0.5 : 1 }}
              onClick={() => {
                localStorage.setItem('selected_invoices', JSON.stringify(selectedInvoices));
                window.location.href = '/generate';
              }}
            >
              Build Report <RiArrowRightLine size={17} />
            </button>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
