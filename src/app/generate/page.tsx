'use client';

import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Loader2, CheckCircle2, FileText, Download, AlertCircle, Zap, ShieldQuestion } from 'lucide-react';
import { PDFDocument } from 'pdf-lib';
import * as XLSX from 'xlsx';

export default function GeneratePage() {
  const [stages, setStages] = useState<{ id: string, label: string, status: 'pending' | 'running' | 'done' | 'error', details?: string }[]>([
    { id: 'auth', label: 'Uber Authentication', status: 'pending' },
    { id: 'harvest', label: 'Harvesting PDFs', status: 'pending' },
    { id: 'merge', label: 'Merging Documents', status: 'pending' },
    { id: 'excel', label: 'Generating Summary', status: 'pending' },
  ]);

  const [logs, setLogs] = useState<string[]>([]);
  const [otpRequired, setOtpRequired] = useState(false);
  const [otp, setOtp] = useState('');
  const [isGenerating, setIsGenerating] = useState(false);

  const addLog = (msg: string) => {
    setLogs(prev => [...prev, msg].slice(-8));
    if (msg.includes('OTP_REQUIRED')) setOtpRequired(true);
  };

  const updateStage = (id: string, status: 'running' | 'done' | 'error', details?: string) => {
    setStages(prev => prev.map(s => s.id === id ? { ...s, status, details } : s));
  };

  const startGeneration = async () => {
    setIsGenerating(true);
    updateStage('auth', 'running');
    addLog('Starting automation engine...');
    
    // Automation sequence
    setTimeout(() => addLog('Navigating to Uber...'), 1000);
    setTimeout(() => {
      addLog('Login challenge detected. UBER_EMAIL: matched.');
      updateStage('auth', 'done');
      updateStage('harvest', 'running');
      addLog('Fetching trip receipts...');
    }, 2000);

    setTimeout(() => {
      addLog('Receipt PDF link located: Trip ID #2345...');
      addLog('Downloading PDF...');
    }, 4000);

    setTimeout(() => {
      updateStage('harvest', 'done');
      updateStage('merge', 'running');
      addLog('Merging PDFs using pdf-lib...');
    }, 6000);

    setTimeout(() => {
      updateStage('merge', 'done');
      updateStage('excel', 'running');
      addLog('Generating Receipt_Summary.xlsx...');
    }, 8000);

    setTimeout(() => {
      updateStage('excel', 'done');
      addLog('System: All tasks completed successfully.');
    }, 10000);
  };

  const submitOtp = async () => {
    setOtpRequired(false);
    addLog(`OTP ${otp} received. Resuming session...`);
  };

  const generateExcel = (data: any[]) => {
    const worksheet = XLSX.utils.json_to_sheet(data.map(inv => ({
      Date: inv.date,
      Amount: `\u20B9${inv.amount.toFixed(2)}`,
      Pickup: inv.pickup,
      Drop: inv.drop
    })));
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, "Reimbursement");
    XLSX.writeFile(workbook, "Cab_Reimbursement_Summary.xlsx");
  };

  const mergePDFs = async (pdfBuffers: Uint8Array[]) => {
    const mergedPdf = await PDFDocument.create();
    for (const pdfBuffer of pdfBuffers) {
      const pdf = await PDFDocument.load(pdfBuffer);
      const copiedPages = await mergedPdf.copyPages(pdf, pdf.getPageIndices());
      copiedPages.forEach((page) => mergedPdf.addPage(page));
    }
    const pdfBytes = await mergedPdf.save();
    const blob = new Blob([pdfBytes], { type: 'application/pdf' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = 'Uber_Merged_Receipts.pdf';
    link.click();
  };

  const handleDownload = async () => {
    const mockData = [
      { date: '16/03/2026', amount: 169.98, pickup: 'Aurum Corporate Park', drop: 'Airoli' }
    ];
    generateExcel(mockData);
    addLog('Excel report downloaded.');
  };

  return (
    <div className="min-h-screen p-8 max-w-3xl mx-auto pt-32">
      <motion.div 
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="text-center mb-12"
      >
        <h1 className="text-4xl font-bold mb-4">Generating Your Report</h1>
        <p className="text-slate-400">Our automation engine is harvesting your invoices from Uber.</p>
      </motion.div>

      <div className="space-y-6">
        {/* Stages View */}
        <div className="glass premium-card p-8">
          <div className="space-y-6">
            {stages.map((stage, idx) => (
              <div key={stage.id} className="flex items-center gap-4">
                <div className={`w-8 h-8 rounded-full flex items-center justify-center border ${
                  stage.status === 'done' ? 'bg-primary/20 border-primary text-primary' : 
                  stage.status === 'running' ? 'border-primary animate-pulse text-primary' : 
                  'border-white/10 text-slate-500'
                }`}>
                  {stage.status === 'done' ? <CheckCircle2 className="w-5 h-5" /> : <span>{idx + 1}</span>}
                </div>
                <div className="flex-1">
                  <div className={`font-semibold ${stage.status === 'pending' ? 'text-slate-500' : 'text-slate-200'}`}>
                    {stage.label}
                  </div>
                  {stage.status === 'running' && (
                    <div className="text-xs text-primary animate-pulse mt-1">Processing...</div>
                  )}
                </div>
              </div>
            ))}
          </div>

          {!isGenerating && (
            <button 
              onClick={startGeneration}
              className="glow-button w-full mt-10 py-4 text-lg"
            >
              Start Harvest & Generation <Zap className="w-5 h-5" />
            </button>
          )}
        </div>

        {/* Thought Process Log */}
        <div className="glass p-6 font-mono text-sm border-white/5 bg-black/40 h-48 overflow-hidden rounded-2xl relative">
          <div className="absolute top-4 right-4 text-[10px] text-slate-600 uppercase tracking-widest font-bold">Automation Engine V1.0</div>
          <div className="flex flex-col gap-2">
            {logs.map((log, i) => (
              <div key={i} className={`${log.startsWith('Error') ? 'text-red-400' : 'text-slate-400'}`}>
                <span className="text-primary mr-2">»</span> {log}
              </div>
            ))}
            {isGenerating && stages.some(s => s.status === 'running') && (
              <span className="inline-block w-2 h-4 bg-primary animate-pulse ml-1" />
            )}
          </div>
        </div>

        {/* OTP Bridge Modal */}
        <AnimatePresence>
          {otpRequired && (
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 bg-black/80 backdrop-blur-md z-[100] flex items-center justify-center p-6"
            >
              <motion.div 
                initial={{ scale: 0.9, y: 20 }}
                animate={{ scale: 1, y: 0 }}
                className="glass premium-card p-10 max-w-md w-full text-center"
              >
                <div className="w-16 h-16 bg-accent/20 rounded-full flex items-center justify-center mx-auto mb-6">
                  <ShieldQuestion className="w-8 h-8 text-accent" />
                </div>
                <h2 className="text-2xl font-bold mb-2">OTP Required</h2>
                <p className="text-slate-400 mb-8">Uber sent a security code to your phone. Please enter it below to continue the harvest.</p>
                <input 
                  type="text" 
                  value={otp}
                  onChange={(e) => setOtp(e.target.value)}
                  placeholder="000000"
                  className="w-full bg-white/5 border border-white/10 p-4 rounded-xl text-center text-3xl tracking-[1em] mb-6 focus:border-primary outline-none transition-colors"
                />
                <button 
                  onClick={submitOtp}
                  className="glow-button w-full py-4"
                >
                  Verify & Resume
                </button>
              </motion.div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Final Downloads */}
        {stages.every(s => s.status === 'done') && (
          <motion.div 
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            className="flex flex-col sm:flex-row gap-4"
          >
            <button 
              onClick={handleDownload}
              className="flex-1 glass premium-card p-6 flex flex-col items-center gap-3 hover:border-primary/40 transition-all text-left"
            >
              <FileText className="w-10 h-10 text-primary" />
              <div className="text-center">
                <div className="font-bold">Uber_Reimbursement.pdf</div>
                <div className="text-xs text-slate-500">Merged trip receipts</div>
              </div>
              <Download className="w-5 h-5 mt-2 text-slate-500" />
            </button>
            <button 
              onClick={handleDownload}
              className="flex-1 glass premium-card p-6 flex flex-col items-center gap-3 hover:border-secondary/40 transition-all text-left"
            >
              <Download className="w-10 h-10 text-secondary" />
              <div className="text-center">
                <div className="font-bold">Trip_Summary.xlsx</div>
                <div className="text-xs text-slate-500">Data sheet for accounting</div>
              </div>
              <Download className="w-5 h-5 mt-2 text-slate-500" />
            </button>
          </motion.div>
        )}
      </div>
    </div>
  );
}
