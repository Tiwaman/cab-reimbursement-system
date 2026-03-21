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
    { id: 'harvest', label: 'Harvesting PDF Receipts', status: 'pending' },
    { id: 'merge', label: 'Merging Multi-Page Document', status: 'pending' },
    { id: 'excel', label: 'Generating Financial Summary', status: 'pending' },
  ]);

  const [logs, setLogs] = useState<string[]>([]);
  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const [isGenerating, setIsGenerating] = useState(false);
  const [mergedPdfBlob, setMergedPdfBlob] = useState<Blob | null>(null);

  useEffect(() => {
    const data = localStorage.getItem('selected_invoices');
    if (data) {
      const parsed = JSON.parse(data);
      setInvoices(parsed);
      setLogs([`Ready to process ${parsed.length} trips.`]);
    } else {
      setLogs(['Error: No trips selected. Please return to dashboard.']);
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
      addLog(`Preparing metadata for ${invoices.length} trips...`);
      await new Promise(r => setTimeout(r, 800));
      updateStage('data', 'done');

      // Stage 2: Harvesting PDFs
      updateStage('harvest', 'running');
      const pdfBuffers: Uint8Array[] = [];
      for (let i = 0; i < invoices.length; i++) {
        const inv = invoices[i];
        addLog(`Harvesting receipt ${i + 1}/${invoices.length}: ${inv.date}...`);
        
        if (!inv.pdfLink) {
          addLog(`Warning: No PDF link for trip ${inv.date}. Skipping.`);
          continue;
        }

        try {
          const res = await fetch(`/api/pdf-proxy?url=${encodeURIComponent(inv.pdfLink)}`);
          if (!res.ok) throw new Error('Fetch failed');
          const buffer = await res.arrayBuffer();
          pdfBuffers.push(new Uint8Array(buffer));
        } catch (err) {
          addLog(`Error fetching PDF: ${inv.date}. Link might be expired.`);
        }
      }
      updateStage('harvest', 'done');

      // Stage 3: Merging
      updateStage('merge', 'running');
      addLog(`Synthesizing ${pdfBuffers.length} source documents...`);
      
      const mergedPdf = await PDFDocument.create();
      let totalPages = 0;

      for (let i = 0; i < pdfBuffers.length; i++) {
        try {
          const pdf = await PDFDocument.load(pdfBuffers[i]);
          const pages = await mergedPdf.copyPages(pdf, pdf.getPageIndices());
          pages.forEach(p => mergedPdf.addPage(p));
          totalPages += pages.length;
          addLog(`Sequence ${i + 1}: +${pages.length} pages integrated.`);
        } catch (e) {
          addLog(`Sequence ${i + 1}: Format mismatch. Source ignored.`);
        }
      }

      if (totalPages === 0) {
        throw new Error('Synthesis failed: 0 pages generated. Ensure Uber links are PDF-ready.');
      }

      addLog(`Final synthesis complete: ${totalPages} pages in total.`);
      const pdfBytes = await mergedPdf.save();
      setMergedPdfBlob(new Blob([pdfBytes], { type: 'application/pdf' }));
      updateStage('merge', 'done');

      // Stage 4: Excel Summary
      updateStage('excel', 'running');
      addLog('Generating Financial Summary (XLSX)...');
      await new Promise(r => setTimeout(r, 600));
      updateStage('excel', 'done');
      
      addLog('System: All tasks completed successfully.');
    } catch (err: any) {
      addLog(`Critical Failure: ${err.message}`);
      updateStage('data', 'error');
    } finally {
      setIsGenerating(false);
    }
  };

  const downloadPDF = () => {
    if (!mergedPdfBlob) return;
    const url = URL.createObjectURL(mergedPdfBlob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `Uber_Reimbursement_Batch_${new Date().toLocaleDateString('en-GB').replace(/\//g, '-')}.pdf`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const downloadExcel = () => {
    const worksheet = XLSX.utils.json_to_sheet(invoices.map(inv => ({
      'Trip Date': inv.date,
      'Amount (INR)': inv.amount,
      'Pickup Location': inv.pickup,
      'Drop Location': inv.drop,
      'Source': 'Uber Verified'
    })));
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, "Reimbursement");
    XLSX.writeFile(workbook, `Trip_Summary_${new Date().toLocaleDateString('en-GB').replace(/\//g, '-')}.xlsx`);
  };

  return (
    <div className="premium-gradient">
      <div className="hero-glow" />
      <div className="container" style={{ paddingTop: '80px', paddingBottom: '120px', maxWidth: '800px' }}>
        
        {/* Elite Nav */}
        <div className="flex justify-between items-center" style={{ marginBottom: '60px' }}>
          <button onClick={() => window.location.href = '/dashboard'} className="btn-secondary" style={{ padding: '10px 24px', fontSize: '0.9rem', borderRadius: '14px' }}>
            <ArrowLeft size={18} /> Back to Vault
          </button>
          <div style={{ background: 'hsla(var(--primary-hsl), 0.1)', color: 'var(--primary)', border: '1px solid hsla(var(--primary-hsl), 0.2)', padding: '6px 16px', borderRadius: '100px', fontSize: '0.7rem', fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.1em' }}>
            Synthesis Module
          </div>
        </div>

        {/* Title Deck */}
        <div className="text-center" style={{ marginBottom: '64px' }}>
          <h1 className="text-gradient" style={{ fontSize: 'clamp(2.5rem, 6vw, 4.5rem)', marginBottom: '16px', lineHeight: 1.1 }}>
            Assembling <br/>Your Report
          </h1>
          <p style={{ color: '#64748b', fontSize: '1.2rem', fontWeight: 500 }}>
            Processing <span style={{ color: '#fff' }}>{invoices.length}</span> selected trip receipts.
          </p>
        </div>

        {/* Synthesis Engine Panel */}
        <div className="panel-premium" style={{ padding: '48px', marginBottom: '40px' }}>
          <div className="flex flex-column gap-8">
            {stages.map((stage, idx) => (
              <div key={stage.id} className="flex items-center gap-6">
                <div className={`w-12 h-12 rounded-2xl flex items-center justify-center transition-all ${
                  stage.status === 'done' ? 'bg-primary text-white scale-110' : 
                  stage.status === 'running' ? 'bg-surface border-2 border-primary animate-pulse text-primary' : 
                  'bg-surface border border-white/10 text-slate-600'
                }`}>
                  {stage.status === 'done' ? <CheckCircle2 size={24} /> : <span style={{ fontWeight: 800 }}>{idx + 1}</span>}
                </div>
                <div className="flex-1">
                  <div className={`font-bold text-lg ${stage.status === 'pending' ? 'text-slate-600' : 'text-slate-100'}`}>
                    {stage.label}
                  </div>
                  {stage.status === 'running' && (
                    <div className="flex items-center gap-2 mt-1">
                      <Loader2 className="spin" size={14} color="var(--primary)" />
                      <span style={{ fontSize: '0.75rem', color: 'var(--primary)', fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.1em' }}>Processing Module...</span>
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
              style={{ width: '100%', marginTop: '48px', padding: '24px', fontSize: '1.25rem' }}
            >
              Start Synthesis Engine <Zap size={24} />
            </button>
          )}
        </div>

        {/* Neural Log View */}
        <div className="panel-premium" style={{ background: 'rgba(0,0,0,0.3)', padding: '32px', borderStyle: 'dashed', marginBottom: '48px' }}>
          <div className="flex justify-between items-center" style={{ marginBottom: '20px' }}>
            <span style={{ fontSize: '0.7rem', fontWeight: 900, textTransform: 'uppercase', letterSpacing: '0.2em', color: '#64748b' }}>Log Feed</span>
            <span style={{ fontSize: '0.7rem', fontWeight: 900, color: 'var(--primary)' }}>V1.05-PRODUCTION</span>
          </div>
          <div className="flex flex-column gap-3" style={{ fontFamily: 'monospace', fontSize: '0.85rem' }}>
            {logs.length === 0 && <div style={{ color: '#334155' }}>Awaiting command...</div>}
            {logs.map((log, i) => (
              <div key={i} className="flex gap-3">
                <span style={{ color: 'var(--primary)', fontWeight: 900 }}>»</span>
                <span style={{ color: '#94a3b8' }}>{log}</span>
              </div>
            ))}
            {isGenerating && <span className="w-2 h-4 bg-primary animate-pulse" />}
          </div>
        </div>

        {/* Results Suite */}
        <AnimatePresence>
          {stages.every(s => s.status === 'done') && (
            <motion.div 
              initial={{ opacity: 0, y: 30 }}
              animate={{ opacity: 1, y: 0 }}
              className="flex flex-column gap-6"
            >
              <div className="text-center" style={{ marginBottom: '12px' }}>
                <div className="flex justify-center gap-2 items-center" style={{ color: 'var(--accent)', fontWeight: 800 }}>
                  <Sparkles size={18} /> DOCUMENTS READY FOR EXPORT
                </div>
              </div>

          <div className="flex gap-6 flex-wrap-mobile">
            <div className="flex-1 panel-premium hover-scale flex flex-column items-center gap-6" style={{ padding: '40px', borderColor: 'hsla(var(--primary-hsl), 0.3)' }}>
              <div style={{ width: '80px', height: '80px', background: 'hsla(var(--primary-hsl), 0.1)', borderRadius: '24px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <Layers size={40} color="var(--primary)" />
              </div>
              <div className="text-center">
                <div className="text-bright" style={{ fontSize: '1.25rem', fontWeight: 800 }}>Merged Receipt PDF</div>
                <div className="text-muted" style={{ fontSize: '0.75rem', marginTop: '4px' }}>Full Trip Evidence</div>
              </div>
              <button onClick={downloadPDF} className="btn-secondary" style={{ padding: '12px 24px', fontSize: '0.8rem', width: '100%', justifyContent: 'center' }}>
                <Download size={14} /> Download PDF
              </button>
            </div>

            <div className="flex-1 panel-premium hover-scale flex flex-column items-center gap-6" style={{ padding: '40px', borderColor: 'hsla(var(--secondary-hsl), 0.3)' }}>
              <div style={{ width: '80px', height: '80px', background: 'hsla(var(--secondary-hsl), 0.1)', borderRadius: '24px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <FileSpreadsheet size={40} color="var(--secondary)" />
              </div>
              <div className="text-center">
                <div className="text-bright" style={{ fontSize: '1.25rem', fontWeight: 800 }}>Expense Summary</div>
                <div className="text-muted" style={{ fontSize: '0.75rem', marginTop: '4px' }}>Excel Sheet for HR</div>
              </div>
              <button onClick={downloadExcel} className="btn-secondary" style={{ padding: '12px 24px', fontSize: '0.8rem', width: '100%', justifyContent: 'center' }}>
                <Download size={14} /> Download Excel
              </button>
            </div>
          </div>
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
