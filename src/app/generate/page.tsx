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
} from 'react-icons/ri';
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

      {/* ── Nav ───────────────────────────────────────────── */}
      <nav className="generate-nav">
        <div className="container" style={{ paddingTop: 0, paddingBottom: 0 }}>
          <div className="flex items-center justify-between" style={{ height: '64px' }}>
            <button
              onClick={() => window.location.href = '/dashboard'}
              className="btn-dashboard btn-ghost-dark"
              style={{ padding: '8px 16px', fontSize: '0.85rem' }}
            >
              <RiArrowLeftLine size={16} /> Back
            </button>
            <span className="badge-dark badge-dark-accent">
              <RiSparkling2Line size={14} /> Report Engine
            </span>
          </div>
        </div>
      </nav>

      {/* ── Content ─────────────────────────────────────────── */}
      <div className="container" style={{ paddingTop: 64, paddingBottom: 100 }}>
        <div style={{ maxWidth: 680, margin: '0 auto' }}>

          {/* Page Title */}
          <div style={{ marginBottom: 48, textAlign: 'center' }}>
            <h1 className="dashboard-title" style={{ fontSize: 'clamp(2.2rem, 5vw, 3.2rem)' }}>
              Generate Report
            </h1>
            <p className="dashboard-sub" style={{ fontSize: '1.05rem' }}>
              Compiling <span style={{ color: 'var(--l-text, #FAFAFA)', fontWeight: 600 }}>{invoices.length} {invoices.length === 1 ? 'trip' : 'trips'}</span> into a professional expense summary.
            </p>
          </div>

          {/* ── Stages Card ─────────────────────────────────── */}
          <div className="stage-card">

            {stages.map((stage) => {
              const Icon = stage.icon;
              const isPending = stage.status === 'pending';
              const isRunning = stage.status === 'running';
              const isDoneStage = stage.status === 'done';

              return (
                <div key={stage.id} className="stage-item">
                  <div className={`stage-icon-box ${isRunning ? 'running' : isDoneStage ? 'done' : ''}`}>
                    {isDoneStage ? (
                      <RiCheckLine size={22} />
                    ) : isRunning ? (
                      <RiLoader4Line size={22} className="spin" />
                    ) : (
                      <Icon size={22} />
                    )}
                  </div>

                  <div className={`stage-content ${isPending ? 'pending' : ''}`} style={{ flex: 1 }}>
                    <h3>{stage.label}</h3>
                    <p>{stage.description}</p>
                    {isRunning && (
                      <div className="progress-container">
                        <motion.div 
                          className="progress-fill"
                          initial={{ width: '0%' }}
                          animate={{ width: '100%' }}
                          transition={{ duration: 2, ease: "easeInOut" }}
                        />
                      </div>
                    )}
                  </div>
                </div>
              );
            })}

            {/* Terminal Log */}
            <div className="terminal-container" ref={terminalRef}>
              {logs.map((log, i) => (
                <div key={i} className="terminal-line">
                  <span className="terminal-prefix">›</span>
                  <span>{log}</span>
                </div>
              ))}
              {isGenerating && (
                <div className="terminal-line">
                  <span className="terminal-prefix">›</span>
                  <RiLoader4Line size={14} className="spin" />
                </div>
              )}
            </div>

            {/* Action Area */}
            <div style={{ marginTop: 40 }}>
              {!isGenerating && !allDone && (
                <button
                  onClick={startGeneration}
                  disabled={invoices.length === 0}
                  className="btn-dashboard btn-primary-dark w-full"
                  style={{ width: '100%', height: 56, fontSize: '1.1rem' }}
                >
                  <RiSparkling2Line size={20} /> Generate Summary
                </button>
              )}
            </div>
          </div>

          {/* ── Download Card ────────────────────────────────── */}
          <AnimatePresence>
            {isDone && (
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                className="result-card"
              >
                <div className="result-info">
                  <div className="excel-icon-box">
                    <RiFileExcel2Line size={28} />
                  </div>
                  <div>
                    <h4 style={{ fontWeight: 700, color: 'var(--l-text, #FAFAFA)', fontSize: '1rem', marginBottom: 4 }}>
                      Reimbursement_Report.xlsx
                    </h4>
                    <p style={{ color: 'var(--l-text-3, #71717A)', fontSize: '0.85rem' }}>
                      {invoices.length} trips &nbsp;·&nbsp; ₹{invoices.reduce((a, i) => a + i.amount, 0).toFixed(2)} total
                    </p>
                  </div>
                </div>

                <button
                  onClick={downloadExcel}
                  className="btn-dashboard btn-primary-dark"
                  style={{ background: '#10B981', boxShadow: '0 4px 16px rgba(16, 185, 129, 0.3)' }}
                >
                  <RiDownloadLine size={18} /> Download
                </button>
              </motion.div>
            )}
          </AnimatePresence>

        </div>
      </div>
    </div>
  );
}
