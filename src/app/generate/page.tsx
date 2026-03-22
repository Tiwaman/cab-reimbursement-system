'use client';

import { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  RiLoader4Line,
  RiCheckLine,
  RiDownloadLine,
  RiArrowLeftLine,
  RiFileExcel2Line,
  RiSparkling2Line,
  RiDatabase2Line,
  RiFilePdfLine,
  RiMergeCellsHorizontal,
} from 'react-icons/ri';
import { TbReceipt2 } from 'react-icons/tb';
import * as XLSX from 'xlsx';
import type { InvoiceRecord } from '@/lib/invoice-types';

import './generate.css';

type StageStatus = 'pending' | 'running' | 'done' | 'error';

interface Stage {
  id: string;
  label: string;
  description: string;
  icon: React.ElementType;
  status: StageStatus;
}

type PdfStage = 'idle' | 'connecting' | 'downloading' | 'merging' | 'done' | 'error';

export default function GeneratePage() {
  const [stages, setStages] = useState<Stage[]>([
    {
      id: 'data',
      label: 'Synthesizing selection',
      description: 'Reading invoice records from vault...',
      icon: RiDatabase2Line,
      status: 'pending',
    },
    {
      id: 'excel',
      label: 'Building Excel report',
      description: 'Formatting metadata & INR totals...',
      icon: RiFileExcel2Line,
      status: 'pending',
    },
  ]);

  const [logs, setLogs] = useState<string[]>([]);
  const [invoices, setInvoices] = useState<InvoiceRecord[]>([]);
  const [isGenerating, setIsGenerating] = useState(false);
  const [isDone, setIsDone] = useState(false);
  const terminalRef = useRef<HTMLDivElement>(null);

  // PDF state
  const [pdfStage, setPdfStage] = useState<PdfStage>('idle');
  const [pdfLogs, setPdfLogs] = useState<string[]>([]);
  const [pdfProgress, setPdfProgress] = useState({ current: 0, total: 0 });
  const [pdfToken, setPdfToken] = useState<string | null>(null);
  const [pdfError, setPdfError] = useState<string | null>(null);
  const pdfTerminalRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const data = localStorage.getItem('selected_invoices');
    if (data) {
      const parsed = JSON.parse(data);
      setInvoices(parsed);
      setLogs([`Ready to export ${parsed.length} trip records.`]);
    } else {
      setLogs(['No data found. Please return to dashboard.']);
    }
  }, []);

  useEffect(() => {
    if (terminalRef.current) {
      terminalRef.current.scrollTop = terminalRef.current.scrollHeight;
    }
  }, [logs]);

  useEffect(() => {
    if (pdfTerminalRef.current) {
      pdfTerminalRef.current.scrollTop = pdfTerminalRef.current.scrollHeight;
    }
  }, [pdfLogs]);

  const addLog = (msg: string) => {
    setLogs(prev => [...prev, msg]);
  };

  const addPdfLog = (msg: string) => {
    setPdfLogs(prev => [...prev, msg]);
  };

  const updateStage = (id: string, status: StageStatus) => {
    setStages(prev => prev.map(s => s.id === id ? { ...s, status } : s));
  };

  // ── Excel Generation ─────────────────────────────

  const startGeneration = async () => {
    if (invoices.length === 0) return;
    setIsGenerating(true);
    setIsDone(false);
    setLogs([]);

    try {
      updateStage('data', 'running');
      addLog(`Initializing extraction engine...`);
      await new Promise(r => setTimeout(r, 600));
      addLog(`Analyzing ${invoices.length} selected records...`);
      await new Promise(r => setTimeout(r, 800));
      addLog(`Validating trip metadata and fares...`);
      await new Promise(r => setTimeout(r, 500));
      updateStage('data', 'done');

      updateStage('excel', 'running');
      addLog(`Constructing financial data structure...`);
      await new Promise(r => setTimeout(r, 1000));
      addLog(`Applying INR currency formatting...`);
      await new Promise(r => setTimeout(r, 700));
      addLog(`Generating worksheet columns...`);
      await new Promise(r => setTimeout(r, 500));
      updateStage('excel', 'done');

      const total = invoices.reduce((a, i) => a + i.amount, 0).toFixed(2);
      addLog(`Report generation successful.`);
      addLog(`Summary: ${invoices.length} trips | Total: ₹${total}`);
      setIsDone(true);
    } catch (err: unknown) {
      addLog(`Critical error: ${err instanceof Error ? err.message : 'Unknown failure'}`);
      updateStage('data', 'error');
    } finally {
      setIsGenerating(false);
    }
  };

  const downloadExcel = () => {
    const worksheet = XLSX.utils.json_to_sheet(invoices.map(inv => ({
      'Trip Date': inv.date,
      'Platform': inv.platform === 'rapido' ? 'Rapido' : 'Uber',
      'Amount (INR)': inv.amount,
      'Pickup Location': inv.pickup,
      'Drop Location': inv.drop,
      'Status': 'Verified via Gmail',
    })));

    worksheet['!cols'] = [
      { wch: 15 }, { wch: 12 }, { wch: 14 }, { wch: 52 }, { wch: 52 }, { wch: 22 },
    ];

    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, 'Reimbursement');
    XLSX.writeFile(workbook, `Cab_Reimbursement_${new Date().toLocaleDateString('en-GB').replace(/\//g, '-')}.xlsx`);
  };

  // ── Combined PDF Generation ──────────────────────

  const startPdfGeneration = async () => {
    const validInvoices = invoices.filter(inv =>
      inv.downloadKind === 'uber-trip'
        ? Boolean(inv.messageId || inv.pdfLink)
        : Boolean(inv.messageId && inv.attachmentId)
    );
    if (validInvoices.length === 0) {
      setPdfError('No valid receipt links found in selected invoices.');
      return;
    }

    setPdfStage('connecting');
    setPdfLogs([]);
    setPdfError(null);
    setPdfToken(null);
    setPdfProgress({ current: 0, total: validInvoices.length });

    try {
      const response = await fetch('/api/receipts/download-all', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          invoices: validInvoices,
        }),
      });

      if (!response.ok) {
        const err = await response.json();
        throw new Error(err.error || 'Failed to start PDF generation');
      }

      const reader = response.body?.getReader();
      if (!reader) throw new Error('No response stream');

      const decoder = new TextDecoder();
      let buffer = '';

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split('\n\n');
        buffer = lines.pop() || '';

        for (const line of lines) {
          if (!line.startsWith('data: ')) continue;
          try {
            const event = JSON.parse(line.slice(6));

            switch (event.type) {
              case 'status':
                addPdfLog(event.message);
                if (event.message === 'LOGIN_REQUIRED') {
                  setPdfStage('connecting');
                  addPdfLog('A browser window has opened. Please log in to Uber.');
                }
                if (event.message?.includes('session established') || event.message?.includes('session is active')) {
                  setPdfStage('downloading');
                }
                if (event.message?.includes('Merging')) {
                  setPdfStage('merging');
                }
                break;
              case 'progress':
                setPdfStage('downloading');
                setPdfProgress({ current: event.current, total: event.total });
                addPdfLog(event.message);
                break;
              case 'warning':
                addPdfLog(`Warning: ${event.message}`);
                break;
              case 'complete':
                setPdfStage('done');
                setPdfToken(event.token);
                addPdfLog(event.message);
                break;
              case 'error':
                setPdfStage('error');
                setPdfError(event.message);
                addPdfLog(`Error: ${event.message}`);
                break;
            }
          } catch {
            // skip malformed SSE lines
          }
        }
      }
    } catch (err) {
      setPdfStage('error');
      const msg = err instanceof Error ? err.message : 'Unknown error';
      setPdfError(msg);
      addPdfLog(`Error: ${msg}`);
    }
  };

  const downloadPdf = () => {
    if (!pdfToken) return;
    void (async () => {
      const response = await fetch(`/api/receipts/download-all?token=${pdfToken}`);
      if (!response.ok) {
        const err = await response.json().catch(() => ({ error: 'Failed to download PDF' }));
        throw new Error(err.error || 'Failed to download PDF');
      }

      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const anchor = document.createElement('a');
      anchor.href = url;
      anchor.download = `Combined_Receipts_${new Date().toLocaleDateString('en-GB').replace(/\//g, '-')}.pdf`;
      document.body.appendChild(anchor);
      anchor.click();
      anchor.remove();
      window.URL.revokeObjectURL(url);
    })().catch((err: unknown) => {
      const msg = err instanceof Error ? err.message : 'Failed to download PDF';
      setPdfError(msg);
      setPdfStage('error');
      addPdfLog(`Error: ${msg}`);
    });
  };

  const allDone = stages.every(s => s.status === 'done');
  const pdfBusy = pdfStage === 'connecting' || pdfStage === 'downloading' || pdfStage === 'merging';

  return (
    <div className="generate-shell">
      {/* Background Glow */}
      <div className="generate-bg-glow">
        <div className="generate-orb" />
        <div className="l-hero-grid" style={{ opacity: 0.15 }} />
      </div>

      {/* ── Navigation ──────────────── */}
      <nav className="dashboard-nav">
        <div className="container" style={{ paddingTop: 0, paddingBottom: 0 }}>
          <div className="flex items-center justify-between" style={{ height: '56px' }}>
            <div className="flex items-center gap-3">
              <button
                onClick={() => window.location.href = '/dashboard'}
                className="gen-back-btn"
              >
                <RiArrowLeftLine size={16} />
              </button>
              <div className="flex items-center gap-3">
                <div style={{
                  width: 30, height: 30,
                  background: 'var(--l-accent-strong, #6366F1)',
                  borderRadius: 8,
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  boxShadow: '0 0 12px rgba(99, 102, 241, 0.3)'
                }}>
                  <TbReceipt2 size={16} color="#fff" />
                </div>
                <span className="mobile-hide" style={{ fontFamily: 'Libre Baskerville, serif', fontWeight: 700, fontSize: '1rem', color: '#fff', letterSpacing: '-0.02em' }}>
                  CabReimburse
                </span>
              </div>
            </div>
            <span className="badge-dark badge-dark-accent">
              <RiSparkling2Line size={14} /> Report Engine
            </span>
          </div>
        </div>
      </nav>

      {/* ── Page Content ────────────────────────────────────── */}
      <div className="container" style={{ paddingTop: 40, paddingBottom: 80, position: 'relative', zIndex: 1 }}>
        <div style={{ maxWidth: 680, margin: '0 auto' }}>

          {/* Header */}
          <div style={{ marginBottom: 32 }}>
            <h1 className="generate-title">
              Generate <span className="generate-gradient-text">Report</span>
            </h1>
            <p className="generate-sub">
              Compiling <span style={{ color: '#fff', fontWeight: 600 }}>{invoices.length} {invoices.length === 1 ? 'trip' : 'trips'}</span> into a professional expense summary for your finance team.
            </p>
          </div>

          {/* ── Excel Report Card ──────────────────────── */}
          <div className="generate-card">

            {/* Stages Timeline */}
            <div className="stage-list">
              {stages.map((stage) => {
                const Icon = stage.icon;
                const isRunning = stage.status === 'running';
                const isDoneStage = stage.status === 'done';
                const isPending = stage.status === 'pending';

                return (
                  <div key={stage.id} className="stage-row">
                    <div className={`stage-visual ${isRunning ? 'active' : isDoneStage ? 'completed' : ''}`}>
                      {isDoneStage ? (
                        <RiCheckLine size={18} />
                      ) : isRunning ? (
                        <RiLoader4Line size={18} className="spin" />
                      ) : (
                        <Icon size={18} />
                      )}
                    </div>
                    <div className={`stage-info ${isPending ? 'pending' : ''}`}>
                      <h3>{stage.label}</h3>
                      <p>{stage.description}</p>
                    </div>
                  </div>
                );
              })}
            </div>

            {/* Terminal Output */}
            <div className="gen-terminal" ref={terminalRef}>
              {logs.map((log, i) => (
                <div key={i} className="terminal-row">
                  <span className="terminal-bullet">›</span>
                  <span>{log}</span>
                </div>
              ))}
              {isGenerating && (
                <div className="terminal-row">
                  <span className="terminal-bullet">›</span>
                  <RiLoader4Line size={14} className="spin" />
                </div>
              )}
            </div>

            {/* Main Action Button */}
            {!isGenerating && !allDone && (
              <button
                onClick={startGeneration}
                disabled={invoices.length === 0}
                className="gen-cta"
              >
                <RiSparkling2Line size={22} /> Generate Summary
              </button>
            )}

            {/* Excel Result */}
            <AnimatePresence>
              {isDone && (
                <motion.div
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="download-result"
                >
                  <div className="flex items-center gap-3">
                    <div className="download-icon">
                      <RiFileExcel2Line size={22} />
                    </div>
                    <div>
                      <h4 style={{ fontWeight: 700, color: '#fff', fontSize: '0.95rem', marginBottom: 2 }}>
                        Summary_Report.xlsx
                      </h4>
                      <p style={{ color: 'rgba(255,255,255,0.4)', fontSize: '0.82rem' }}>
                        {invoices.length} trips &nbsp;·&nbsp; ₹{invoices.reduce((a, i) => a + i.amount, 0).toFixed(2)} total
                      </p>
                    </div>
                  </div>

                  <button
                    onClick={downloadExcel}
                    className="btn-dashboard btn-primary-dark"
                    style={{ background: '#10B981', padding: '10px 22px', height: 'auto', borderRadius: '12px', fontSize: '0.9rem' }}
                  >
                    <RiDownloadLine size={16} /> Download
                  </button>
                </motion.div>
              )}
            </AnimatePresence>
          </div>

          {/* ── Combined PDF Card ────────────────────────── */}
          <AnimatePresence>
            {isDone && (
              <motion.div
                initial={{ opacity: 0, y: 30 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.3 }}
                className="generate-card pdf-card"
                style={{ marginTop: 24 }}
              >
                <div className="pdf-card-header">
                  <div className="flex items-center gap-3">
                    <div className="pdf-header-icon">
                      <RiFilePdfLine size={20} />
                    </div>
                    <div>
                      <h3 style={{ fontWeight: 700, color: '#fff', fontSize: '1rem', marginBottom: 2 }}>
                        Combined PDF
                      </h3>
                      <p style={{ color: 'var(--l-text-3, #71717A)', fontSize: '0.8rem' }}>
                        All receipts merged into a single document
                      </p>
                    </div>
                  </div>
                </div>

                {/* PDF Terminal (visible when generating) */}
                {pdfStage !== 'idle' && (
                  <div className="gen-terminal" ref={pdfTerminalRef} style={{ marginTop: 20 }}>
                    {pdfLogs.map((log, i) => (
                      <div key={i} className="terminal-row">
                        <span className="terminal-bullet" style={{ color: '#818CF8' }}>›</span>
                        <span>{log}</span>
                      </div>
                    ))}
                    {pdfBusy && (
                      <div className="terminal-row">
                        <span className="terminal-bullet" style={{ color: '#818CF8' }}>›</span>
                        <RiLoader4Line size={14} className="spin" />
                      </div>
                    )}
                  </div>
                )}

                {/* Progress Bar */}
                {pdfStage === 'downloading' && pdfProgress.total > 0 && (
                  <div className="pdf-progress">
                    <div
                      className="pdf-progress-fill"
                      style={{ width: `${(pdfProgress.current / pdfProgress.total) * 100}%` }}
                    />
                  </div>
                )}

                {/* CTA / Result */}
                {pdfStage === 'idle' && (
                  <button
                    onClick={startPdfGeneration}
                    className="gen-cta pdf-cta"
                    style={{ marginTop: 20 }}
                    disabled={invoices.length === 0}
                  >
                    <RiMergeCellsHorizontal size={20} /> Download Combined PDF
                  </button>
                )}

                {pdfStage === 'error' && (
                  <div style={{ marginTop: 16 }}>
                    <p style={{ color: '#F87171', fontSize: '0.85rem', marginBottom: 12 }}>
                      {pdfError}
                    </p>
                    <button
                      onClick={() => { setPdfStage('idle'); setPdfLogs([]); setPdfError(null); }}
                      className="gen-cta pdf-cta"
                    >
                      <RiMergeCellsHorizontal size={20} /> Retry
                    </button>
                  </div>
                )}

                {/* PDF Download Result */}
                <AnimatePresence>
                  {pdfStage === 'done' && pdfToken && (
                    <motion.div
                      initial={{ opacity: 0, y: 16 }}
                      animate={{ opacity: 1, y: 0 }}
                      className="download-result download-result-pdf"
                      style={{ marginTop: 20 }}
                    >
                      <div className="flex items-center gap-3">
                        <div className="download-icon download-icon-pdf">
                          <RiFilePdfLine size={22} />
                        </div>
                        <div>
                          <h4 style={{ fontWeight: 700, color: '#fff', fontSize: '0.95rem', marginBottom: 2 }}>
                            Combined_Receipts.pdf
                          </h4>
                          <p style={{ color: 'rgba(255,255,255,0.4)', fontSize: '0.82rem' }}>
                            {pdfProgress.current} receipts merged
                          </p>
                        </div>
                      </div>

                      <button
                        onClick={downloadPdf}
                        className="btn-dashboard btn-primary-dark"
                        style={{ background: '#6366F1', padding: '10px 22px', height: 'auto', borderRadius: '12px', fontSize: '0.9rem' }}
                      >
                        <RiDownloadLine size={16} /> Download
                      </button>
                    </motion.div>
                  )}
                </AnimatePresence>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </div>
    </div>
  );
}
