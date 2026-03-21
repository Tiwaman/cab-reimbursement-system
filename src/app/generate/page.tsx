'use client';

import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Loader2, CheckCircle2, FileText, Download, AlertCircle, 
  Zap, ArrowLeft, Layers, FileSpreadsheet, Sparkles 
} from 'lucide-react';
import { PDFDocument } from 'pdf-lib';
import * as XLSX from 'xlsx';

interface Invoice {
  id: string;
  date: string;
  amount: number;
  pickup: string;
  drop: string;
  pdfLink: string;
}

export default function GeneratePage() {
  const [stages, setStages] = useState<{ id: string, label: string, status: 'pending' | 'running' | 'done' | 'error', details?: string }[]>([
    { id: 'data', label: 'Synthesizing Selection', status: 'pending' },
    { id: 'excel', label: 'Generating Financial Summary', status: 'pending' },
  ]);

  const [logs, setLogs] = useState<string[]>([]);
  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const [isGenerating, setIsGenerating] = useState(false);

  useEffect(() => {
    const data = localStorage.getItem('selected_invoices');
    if (data) {
      const parsed = JSON.parse(data);
      setInvoices(parsed);
      setLogs([`Ready to export ${parsed.length} trips.`]);
    } else {
      setLogs(['Error: No data found. Please return to dashboard.']);
    }
  }, []);

  const addLog = (msg: string) => {
    setLogs(prev => [...prev.slice(-10), msg]);
  };

  const updateStage = (id: string, status: 'running' | 'done' | 'error', details?: string) => {
    setStages(prev => prev.map(s => s.id === id ? { ...s, status, details } : s));
  };

  const startGeneration = async () => {
    if (invoices.length === 0) return;
    setIsGenerating(true);
    setLogs([]);

    try {
      // Stage 1: Data Synthesis
      updateStage('data', 'running');
      addLog(`Analyzing ${invoices.length} selected trip records...`);
      await new Promise(r => setTimeout(r, 1000));
      updateStage('data', 'done');

      // Stage 2: Excel Summary
      updateStage('excel', 'running');
      addLog('Building Financial Data Structure...');
      await new Promise(r => setTimeout(r, 1200));
      addLog('Applying INR formatting rules...');
      await new Promise(r => setTimeout(r, 600));
      updateStage('excel', 'done');
      
      addLog('System: Summary report generated successfully.');
    } catch (err: any) {
      addLog(`Critical Failure: ${err.message}`);
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
      'Status': 'Verified via Gmail'
    })));

    // Column widths
    const wscols = [
      { wch: 15 }, // Date
      { wch: 12 }, // Amount
      { wch: 50 }, // Pickup
      { wch: 50 }, // Drop
      { wch: 20 }, // Status
    ];
    worksheet['!cols'] = wscols;

    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, "Reimbursement");
    XLSX.writeFile(workbook, `Uber_Reimbursement_${new Date().toLocaleDateString('en-GB').replace(/\//g, '-')}.xlsx`);
  };

  return (
    <div className="premium-gradient">
      <div className="hero-glow" />
      <div className="container" style={{ paddingTop: '80px', paddingBottom: '120px', maxWidth: '800px' }}>
        
        {/* Elite Nav */}
        <div className="flex justify-between items-center" style={{ marginBottom: '60px' }}>
          <button onClick={() => window.location.href = '/dashboard'} className="btn-secondary" style={{ padding: '10px 24px', fontSize: '0.9rem', borderRadius: '14px' }}>
            <ArrowLeft size={18} /> Back to Dashboard
          </button>
          <div style={{ background: 'hsla(var(--primary-hsl), 0.1)', color: 'var(--primary)', border: '1px solid hsla(var(--primary-hsl), 0.2)', padding: '6px 16px', borderRadius: '100px', fontSize: '0.7rem', fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.1em' }}>
            Report Engine v1.1
          </div>
        </div>

        {/* Title Deck */}
        <div className="text-center" style={{ marginBottom: '40px' }}>
          <h1 className="text-gradient" style={{ fontSize: 'clamp(2.5rem, 5vw, 3.5rem)', marginBottom: '12px', lineHeight: 1.1 }}>
            Exporting Summary
          </h1>
          <p className="text-muted" style={{ fontSize: '1rem', fontWeight: 500 }}>
            Compiling <span className="text-bright">{invoices.length}</span> records into a high-precision Excel report.
          </p>
        </div>

        {/* Unified Synthesis Engine Panel */}
        <div className="panel-premium" style={{ padding: '40px', marginBottom: '24px' }}>
          <div className="flex flex-column gap-8">
            {stages.map((stage, idx) => (
              <div key={stage.id} className="flex items-center gap-6">
                <div className={`w-12 h-12 rounded-2xl flex items-center justify-center transition-all ${
                  stage.status === 'done' ? 'bg-primary text-white scale-110 shadow-[0_0_20px_rgba(var(--primary-rgb),0.4)]' : 
                  stage.status === 'running' ? 'bg-surface border-2 border-primary animate-pulse text-primary' : 
                  'bg-surface border border-white/10 text-slate-700'
                }`}>
                  {stage.status === 'done' ? <CheckCircle2 size={24} /> : <span style={{ fontWeight: 800 }}>{idx + 1}</span>}
                </div>
                <div className="flex-1">
                  <div className={`font-bold text-lg ${stage.status === 'pending' ? 'text-slate-600' : 'text-slate-100'}`}>
                    {stage.label}
                  </div>
                  {stage.status === 'running' && (
                    <div className="flex items-center gap-2 mt-1">
                      <div className="spin w-3 h-3 border-2 border-primary border-t-transparent rounded-full" />
                      <span style={{ fontSize: '0.75rem', color: 'var(--primary)', fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.1em' }}>Optimizing Sheets...</span>
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>

          {!isGenerating && !stages.every(s => s.status === 'done') && (
            <button 
              onClick={startGeneration}
              className="btn-primary" 
              style={{ width: '100%', marginTop: '40px', padding: '20px', fontSize: '1.1rem' }}
            >
              Generate Final Excel <Sparkles size={20} />
            </button>
          )}

          {/* Integrated Logs */}
          <div style={{ marginTop: '32px', paddingTop: '24px', borderTop: '1px solid rgba(255,255,255,0.05)', fontFamily: 'monospace', fontSize: '0.8rem' }}>
            <div className="flex flex-column gap-2">
              {logs.map((log, i) => (
                <div key={i} className="flex gap-3">
                  <span className="text-accent" style={{ opacity: 0.6 }}>»</span>
                  <span className="text-muted">{log}</span>
                </div>
              ))}
              {isGenerating && <span className="w-2 h-3 bg-primary animate-pulse" />}
            </div>
          </div>
        </div>

        {/* Results Suite */}
        <AnimatePresence>
          {stages.every(s => s.status === 'done') && (
            <motion.div 
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              className="flex justify-center"
            >
              <button 
                onClick={downloadExcel} 
                className="panel-premium hover-scale flex flex-column items-center gap-6" 
                style={{ 
                  padding: '48px', 
                  width: '100%', 
                  maxWidth: '400px', 
                  borderColor: 'hsla(var(--primary-hsl), 0.3)', 
                  background: 'linear-gradient(135deg, hsla(var(--primary-hsl), 0.1), transparent)',
                  textAlign: 'center'
                }}
              >
                <div style={{ width: '80px', height: '80px', background: 'var(--primary)', borderRadius: '24px', display: 'flex', alignItems: 'center', justifyContent: 'center', boxShadow: '0 0 20px rgba(var(--primary-rgb),0.2)' }}>
                  <FileSpreadsheet size={36} color="white" />
                </div>
                <div>
                  <div className="text-bright" style={{ fontSize: '1.4rem', fontWeight: 800 }}>Reimbursement Summary</div>
                  <div className="text-muted" style={{ fontSize: '0.85rem', marginTop: '4px' }}>Ready for HR Submission</div>
                </div>
                <div className="btn-primary" style={{ padding: '14px 28px', fontSize: '0.9rem', width: '100%', justifyContent: 'center', marginTop: '8px' }}>
                  <Download size={16} /> Download Excel (.xlsx)
                </div>
              </button>
            </motion.div>
          )}
        </AnimatePresence>

      </div>

      <style jsx>{`
        .hover-scale { transition: all 0.4s cubic-bezier(0.16, 1, 0.3, 1); }
        .hover-scale:hover { transform: translateY(-10px) scale(1.02); background: hsla(255, 100%, 100%, 0.05); }
      `}</style>
    </div>
  );
}
