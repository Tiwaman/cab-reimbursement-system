'use client';

import { signIn, useSession } from 'next-auth/react';
import { motion } from 'framer-motion';
import { Mail, ArrowRight, ShieldCheck, Zap, FileText, Sparkles, Play } from 'lucide-react';

export default function LandingPage() {
  const { data: session } = useSession();

  const scrollToFeatures = () => {
    document.getElementById('features')?.scrollIntoView({ behavior: 'smooth' });
  };

  return (
    <div className="premium-gradient">
      <div className="hero-glow" />
      
      <main className="hero-wrapper">
        {/* Animated Badge */}
        <motion.div 
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          className="badge"
          style={{ marginBottom: '32px' }}
        >
          <Sparkles size={16} color="var(--primary)" />
          NEXT-GEN INVOICE AUTOMATION
        </motion.div>

        {/* Main Heading */}
        <motion.h1 
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.8, ease: [0.16, 1, 0.3, 1] }}
          className="text-gradient"
          style={{ fontSize: 'clamp(4rem, 12vw, 9rem)', lineHeight: 0.85, marginBottom: '40px' }}
        >
          Reimburse your cab <br /> 
          <span style={{ color: 'var(--secondary)', stroke: '1px var(--secondary)' }}>fees instantly.</span>
        </motion.h1>

        {/* Subtitle */}
        <motion.p 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3 }}
          style={{ 
            color: '#94a3b8', 
            fontSize: 'max(1.2rem, 1.5vw)', 
            maxWidth: '850px', 
            margin: '0 auto 64px',
            fontWeight: 500,
            lineHeight: 1.4
          }}
        >
          Ditch the spreadsheets. Sync your <span style={{ color: '#fff' }}>Gmail</span> workspace and let our 
          AI-driven engine harvest, validate, and merge your Uber receipts into 
          professional reports in seconds.
        </motion.p>

        {/* Actions Deck */}
        <motion.div 
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.4 }}
          className="flex gap-12 items-center"
          style={{ flexWrap: 'wrap', justifyContent: 'center' }}
        >
          {session ? (
            <button 
              onClick={() => window.location.href = '/dashboard'}
              className="btn-primary"
            >
              Enter Dashboard
              <ArrowRight size={24} />
            </button>
          ) : (
            <button 
              onClick={() => signIn('google')}
              className="btn-primary"
            >
              <Mail size={24} /> Link your Gmail
            </button>
          )}
          <button 
            onClick={scrollToFeatures}
            className="btn-secondary"
          >
            <Play size={22} fill="white" /> See how it works
          </button>
        </motion.div>

        {/* Features Content */}
        <section id="features" className="container" style={{ marginTop: '160px' }}>
          <div style={{ 
            display: 'grid', 
            gridTemplateColumns: 'repeat(auto-fit, minmax(360px, 1fr))', 
            gap: '32px',
            width: '100%'
          }}>
            <motion.div initial={{ opacity: 0, y: 40 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} className="card-feature">
              <div style={{ width: '72px', height: '72px', background: 'hsla(var(--primary-hsl), 0.1)', borderRadius: '24px', display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: '32px' }}>
                <Zap size={32} color="var(--primary)" />
              </div>
              <h3 style={{ fontSize: '1.8rem', marginBottom: '16px' }}>Smart Scraping</h3>
              <p style={{ color: '#94a3b8', fontSize: '1.1rem', lineHeight: 1.5 }}>
                Hyper-accurate extraction of trip logistics, VAT totals, and currency data from raw email sources.
              </p>
            </motion.div>

            <motion.div initial={{ opacity: 0, y: 40 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} transition={{ delay: 0.1 }} className="card-feature">
              <div style={{ width: '72px', height: '72px', background: 'hsla(var(--accent-hsl), 0.1)', borderRadius: '24px', display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: '32px' }}>
                <FileText size={32} color="var(--accent)" />
              </div>
              <h3 style={{ fontSize: '1.8rem', marginBottom: '16px' }}>Vault Harvesting</h3>
              <p style={{ color: '#94a3b8', fontSize: '1.1rem', lineHeight: 1.5 }}>
                Secure orchestration of headless browsers to pull official tax documents from Uber's secure portals.
              </p>
            </motion.div>

            <motion.div initial={{ opacity: 0, y: 40 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} transition={{ delay: 0.2 }} className="card-feature">
              <div style={{ width: '72px', height: '72px', background: 'hsla(var(--secondary-hsl), 0.1)', borderRadius: '24px', display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: '32px' }}>
                <ShieldCheck size={32} color="var(--secondary)" />
              </div>
              <h3 style={{ fontSize: '1.8rem', marginBottom: '16px' }}>Corporate Ready</h3>
              <p style={{ color: '#94a3b8', fontSize: '1.1rem', lineHeight: 1.5 }}>
                Professional merging of PDF evidence and auto-generation of Excel audit logs for Finance teams.
              </p>
            </motion.div>
          </div>
        </section>
      </main>
    </div>
  );
}
