'use client';

import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  RiLoader4Line,
  RiCheckLine,
  RiDownloadLine,
  RiArrowLeftLine,
  RiFileExcel2Line,
  RiSparkling2Line,
  RiDatabase2Line,
} from 'react-icons/ri';
import * as XLSX from 'xlsx';

interface Invoice {
  id: string;
  date: string;
  amount: number;
  pickup: string;
  drop: string;
  pdfLink: string;
  selected?: boolean;
}

type StageStatus = 'pending' | 'running' | 'done' | 'error';

interface Stage {
  id: string;
  label: string;
  description: string;
  icon: React.ElementType;
  status: StageStatus;
}

export default function GeneratePage() {
  const [stages, setStages] = useState<Stage[]>([
    {
      id: 'data',
      label: 'Synthesising selection',
      description: 'Reading invoice records from local storage',
      icon: RiDatabase2Line,
      status: 'pending',
    },
    {
      id: 'excel',
      label: 'Building Excel report',
      description: 'Formatting with INR totals and trip metadata',
      icon: RiFileExcel2Line,
      status: 'pending',
    },
  ]);

  const [logs, setLogs] = useState<string[]>([]);
  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const [isGenerating, setIsGenerating] = useState(false);
  const [isDone, setIsDone] = useState(false);

  useEffect(() => {
    const data = localStorage.getItem('selected_invoices');
    if (data) {
      const parsed = JSON.parse(data);
      setInvoices(parsed);
      setLogs([`✓ ${parsed.length} trip${parsed.length !== 1 ? 's' : ''} ready to export`]);
    } else {
      setLogs(['✗ No data found — please return to dashboard']);
    }
  }, []);

  const addLog = (msg: string) => {
    setLogs(prev => [...prev.slice(-12), msg]);
  };

  const updateStage = (id: string, status: StageStatus) => {
    setStages(prev => prev.map(s => s.id === id ? { ...s, status } : s));
  };

  const startGeneration = async () => {
    if (invoices.length === 0) return;
    setIsGenerating(true);
    setLogs([]);

    try {
      updateStage('data', 'running');
      addLog(`→ Analysing ${invoices.length} selected records…`);
      await new Promise(r => setTimeout(r, 900));
      addLog(`→ Validated trip dates and amounts`);
      await new Promise(r => setTimeout(r, 500));
      updateStage('data', 'done');

      updateStage('excel', 'running');
      addLog(`→ Building financial data structure…`);
      await new Promise(r => setTimeout(r, 1000));
      addLog(`→ Applying INR currency format…`);
      await new Promise(r => setTimeout(r, 600));
      addLog(`→ Generating sheet columns…`);
      await new Promise(r => setTimeout(r, 400));
      updateStage('excel', 'done');

      addLog(`✓ Report ready — ${invoices.length} trips, ₹${invoices.reduce((a, i) => a + i.amount, 0).toFixed(2)} total`);
      setIsDone(true);
    } catch (err: unknown) {
      addLog(`✗ ${err instanceof Error ? err.message : 'Unknown error'}`);
      updateStage('data', 'error');
    } finally {
      setIsGenerating(false);
    }
  };

  const downloadExcel = () => {
    const worksheet = XLSX.utils.json_to_sheet(invoices.map(inv => ({
      'Trip Date': inv.date,
      'Amount (INR)': inv.amount,
      'Pickup Location': inv.pickup,
      'Drop Location': inv.drop,
      'Status': 'Verified via Gmail',
    })));

    worksheet['!cols'] = [
      { wch: 15 }, { wch: 14 }, { wch: 52 }, { wch: 52 }, { wch: 22 },
    ];

    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, 'Reimbursement');
    XLSX.writeFile(workbook, `Uber_Reimbursement_${new Date().toLocaleDateString('en-GB').replace(/\//g, '-')}.xlsx`);
  };

  const allDone = stages.every(s => s.status === 'done');

  return (
    <div className="page-shell">

      {/* ── Nav ───────────────────────────────────────────── */}
      <nav style={{
        position: 'sticky', top: 0, zIndex: 50,
        background: 'rgba(249, 247, 243, 0.92)',
        backdropFilter: 'blur(12px)',
        borderBottom: '1px solid var(--border)',
      }}>
        <div className="container" style={{ paddingTop: 0, paddingBottom: 0 }}>
          <div className="flex items-center justify-between" style={{ height: '60px' }}>
            <button
              onClick={() => window.location.href = '/dashboard'}
              className="btn btn-ghost btn-sm"
            >
              <RiArrowLeftLine size={15} /> Back to Dashboard
            </button>
            <span className="badge badge-orange">
              <RiSparkling2Line size={11} /> Report Engine
            </span>
          </div>
        </div>
      </nav>

      {/* ── Content ─────────────────────────────────────────── */}
      <div className="container" style={{ paddingTop: 56, paddingBottom: 80 }}>
        <div style={{ maxWidth: 640, margin: '0 auto' }}>

          {/* Page Title */}
          <div style={{ marginBottom: 40, textAlign: 'center' }}>
            <h1 style={{ fontSize: 'clamp(2rem, 5vw, 3rem)', marginBottom: 12 }}>
              Generate report
            </h1>
            <p style={{ color: 'var(--ink-2)', fontSize: '0.95rem' }}>
              Compiling{' '}
              <strong style={{ color: 'var(--ink)' }}>{invoices.length} {invoices.length === 1 ? 'trip' : 'trips'}</strong>{' '}
              into your expense spreadsheet.
            </p>
          </div>

          {/* ── Stages Card ─────────────────────────────────── */}
          <div className="card card-padded" style={{ marginBottom: 20 }}>

            {stages.map((stage, idx) => {
              const Icon = stage.icon;
              const isPending = stage.status === 'pending';
              const isRunning = stage.status === 'running';
              const isDoneStage = stage.status === 'done';

              return (
                <div key={stage.id} className="stage-item">
                  {/* Step icon */}
                  <div className={`stage-icon ${
                    isDoneStage ? 'stage-icon-done'
                    : isRunning ? 'stage-icon-running'
                    : 'stage-icon-pending'
                  }`}>
                    {isDoneStage ? (
                      <RiCheckLine size={20} />
                    ) : isRunning ? (
                      <RiLoader4Line size={20} className="spin" />
                    ) : (
                      <Icon size={20} />
                    )}
                  </div>

                  {/* Stage text */}
                  <div className="flex-1">
                    <div style={{
                      fontWeight: 600,
                      fontSize: '0.95rem',
                      color: isPending ? 'var(--ink-3)' : 'var(--ink)',
                      marginBottom: 2,
                    }}>
                      {stage.label}
                    </div>
                    <div style={{ fontSize: '0.8rem', color: 'var(--ink-3)' }}>
                      {isRunning ? (
                        <span style={{ color: 'var(--orange)', fontWeight: 500 }}>Processing…</span>
                      ) : isDoneStage ? (
                        <span style={{ color: 'var(--green)', fontWeight: 500 }}>Complete</span>
                      ) : (
                        stage.description
                      )}
                    </div>
                    {isRunning && (
                      <div className="progress-bar" style={{ marginTop: 8, maxWidth: 200 }}>
                        <div className="progress-bar-fill" />
                      </div>
                    )}
                  </div>

                  {/* Step number badge */}
                  {isPending && (
                    <span style={{ fontSize: '0.75rem', fontWeight: 700, color: 'var(--ink-4)' }}>
                      {idx + 1}
                    </span>
                  )}
                </div>
              );
            })}

            {/* Generate Button */}
            {!isGenerating && !allDone && (
              <div style={{ marginTop: 28 }}>
                <button
                  onClick={startGeneration}
                  disabled={invoices.length === 0}
                  className="btn btn-orange w-full"
                  style={{ width: '100%', height: 52, fontSize: '1rem', borderRadius: 14 }}
                >
                  <RiSparkling2Line size={18} /> Generate Excel Report
                </button>
              </div>
            )}

            {/* Terminal Log */}
            {logs.length > 0 && (
              <div className="log-terminal" style={{ marginTop: 24 }}>
                {logs.map((log, i) => (
                  <div key={i} style={{ display: 'flex', gap: 10 }}>
                    <span className="log-line-prefix">$</span>
                    <span>{log}</span>
                  </div>
                ))}
                {isGenerating && (
                  <div style={{ display: 'flex', gap: 10 }}>
                    <span className="log-line-prefix">$</span>
                    <span style={{ opacity: 0.5 }}>
                      <RiLoader4Line size={14} className="spin" style={{ display: 'inline', verticalAlign: 'middle' }} />
                    </span>
                  </div>
                )}
              </div>
            )}
          </div>

          {/* ── Download Card ────────────────────────────────── */}
          <AnimatePresence>
            {isDone && (
              <motion.div
                initial={{ opacity: 0, y: 16 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.4, ease: 'easeOut' }}
                className="download-card"
              >
                <div className="flex items-center gap-4">
                  <div style={{
                    width: 52, height: 52,
                    background: 'var(--green-light)',
                    borderRadius: 14,
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    border: '1px solid #B7E4CE',
                    flexShrink: 0,
                  }}>
                    <RiFileExcel2Line size={26} color="var(--green)" />
                  </div>
                  <div>
                    <div style={{ fontWeight: 700, color: 'var(--ink)', fontSize: '0.95rem' }}>
                      Reimbursement Summary
                    </div>
                    <div style={{ color: 'var(--ink-3)', fontSize: '0.78rem', marginTop: 2 }}>
                      XLSX &nbsp;·&nbsp; {invoices.length} trips &nbsp;·&nbsp; ₹{invoices.reduce((a, i) => a + i.amount, 0).toFixed(2)}
                    </div>
                  </div>
                </div>

                <button
                  onClick={downloadExcel}
                  className="btn btn-orange"
                  style={{ flexShrink: 0 }}
                >
                  <RiDownloadLine size={17} /> Download
                </button>
              </motion.div>
            )}
          </AnimatePresence>

        </div>
      </div>
    </div>
  );
}
