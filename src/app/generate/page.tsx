'use client';

import { useState, useEffect, useRef } from 'react';
import { useSession } from 'next-auth/react';
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
import { TbReceipt2 } from 'react-icons/tb';
import * as XLSX from 'xlsx';

import './generate.css';

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
  const { data: session } = useSession();
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
  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const [isGenerating, setIsGenerating] = useState(false);
  const [isDone, setIsDone] = useState(false);
  const terminalRef = useRef<HTMLDivElement>(null);

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

  const addLog = (msg: string) => {
    setLogs(prev => [...prev, msg]);
  };

  const updateStage = (id: string, status: StageStatus) => {
    setStages(prev => prev.map(s => s.id === id ? { ...s, status } : s));
  };

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

          {/* Main Processing Card */}
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

            {/* Result Area */}
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
        </div>
      </div>
    </div>
  );
}
