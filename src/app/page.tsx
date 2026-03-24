"use client";

import Image from "next/image";
import { signIn, useSession } from "next-auth/react";
import { motion } from "framer-motion";
import type { TargetAndTransition, Variants } from "framer-motion";
import {
  RiGoogleLine,
  RiArrowRightLine,
  RiShieldKeyholeLine,
  RiFileExcel2Line,
  RiFilePdf2Line,
  RiLockLine,
  RiEyeOffLine,
  RiSparklingLine,
  RiTimeLine,
  RiArrowDownLine,
} from "react-icons/ri";
import {
  TbReceipt2,
  TbBrain,
  TbPlugConnected,
  TbShieldCheck,
} from "react-icons/tb";
import { SiUber } from "react-icons/si";
import Link from "next/link";

/* ── Animation Helpers ──────────────────────────────────────── */
const fadeUp: Variants = {
  hidden: { opacity: 0, y: 30 },
  visible: (i = 0): TargetAndTransition => {
    const delay = typeof i === "number" ? i * 0.1 : 0;

    return {
      opacity: 1,
      y: 0,
      transition: {
        duration: 0.6,
        delay,
        ease: [0.25, 0.46, 0.45, 0.94] as [number, number, number, number],
      },
    };
  },
};

const stagger = {
  visible: { transition: { staggerChildren: 0.08 } },
};

/* ── Mock Data for the Hero Mockup ──────────────────────────── */
const mockRows = [
  {
    date: "Mar 21",
    amount: "₹342",
    from: "Koramangala",
    to: "HSR Layout",
    platform: "Uber",
    cls: "l-platform-uber",
  },
  {
    date: "Mar 19",
    amount: "₹215",
    from: "Indiranagar",
    to: "MG Road",
    platform: "Ola",
    cls: "l-platform-ola",
  },
  {
    date: "Mar 17",
    amount: "₹567",
    from: "Airport",
    to: "Electronic City",
    platform: "Rapido",
    cls: "l-platform-rapido",
  },
  {
    date: "Mar 15",
    amount: "₹189",
    from: "Whitefield",
    to: "Marathahalli",
    platform: "Uber",
    cls: "l-platform-uber",
  },
  {
    date: "Mar 12",
    amount: "₹423",
    from: "JP Nagar",
    to: "Silk Board",
    platform: "Ola",
    cls: "l-platform-ola",
  },
];

/* ── How It Works Steps ─────────────────────────────────────── */
const steps = [
  {
    num: "01",
    icon: RiGoogleLine,
    title: "Connect your Gmail",
    description:
      "One-click Google sign-in with verified read-only access. We can only see cab receipts — nothing else touches your inbox.",
  },
  {
    num: "02",
    icon: TbBrain,
    title: "We scan & extract",
    description:
      "Our system finds every ride receipt from Uber, Ola, and Rapido. Dates, fares, and routes — extracted automatically.",
  },
  {
    num: "03",
    icon: RiFilePdf2Line,
    title: "Download your report",
    description:
      "Get a bundled PDF with all receipts and a formatted Excel spreadsheet. Submit to your finance team in seconds.",
  },
];

/* ── Features Data ──────────────────────────────────────────── */
const features = [
  {
    icon: TbPlugConnected,
    title: "Multi-Platform",
    description:
      "Uber, Ola, Rapido — and more coming. One system that catches every cab receipt across all platforms.",
    iconClass: "l-bento-icon-indigo",
  },
  {
    icon: RiSparklingLine,
    title: "Smart Extraction",
    description:
      "Trip dates, INR amounts, pickup & drop locations — pulled from raw email HTML with precision.",
    iconClass: "l-bento-icon-amber",
  },
  {
    icon: RiFilePdf2Line,
    title: "One PDF Bundle",
    description:
      "Every receipt collated into a single, clean PDF. No more hunting through email threads.",
    iconClass: "l-bento-icon-indigo",
  },
  {
    icon: RiFileExcel2Line,
    title: "Excel Spreadsheet",
    description:
      "A structured spreadsheet with all trip details formatted exactly how finance teams expect it.",
    iconClass: "l-bento-icon-emerald",
  },
  {
    icon: RiTimeLine,
    title: "Instant Processing",
    description:
      "From inbox scan to downloadable report in under a minute. What used to take hours, done while you sip chai.",
    iconClass: "l-bento-icon-amber",
  },
  {
    icon: RiShieldKeyholeLine,
    title: "Bank-Grade Security",
    description:
      "OAuth 2.0 verified by Google. Read-only access. Your emails are never stored on our servers.",
    iconClass: "l-bento-icon-emerald",
  },
];

/* ── Security Items ─────────────────────────────────────────── */
const securityItems = [
  {
    icon: TbShieldCheck,
    title: "Google Verified",
    description: "OAuth 2.0 consent reviewed and approved by Google.",
  },
  {
    icon: RiEyeOffLine,
    title: "Read-Only Access",
    description: "We can never modify, send, or delete your emails.",
  },
  {
    icon: RiLockLine,
    title: "No Data Stored",
    description: "Your receipt data is never retained after export.",
  },
];

/* ══════════════════════════════════════════════════════════════
   LANDING PAGE
   ══════════════════════════════════════════════════════════════ */
export default function LandingPage() {
  const { data: session, status } = useSession();

  const handleCTA = () => {
    if (session) {
      window.location.href = "/dashboard";
    } else {
      signIn("google");
    }
  };

  return (
    <div className="landing" suppressHydrationWarning>
      {/* ── Navigation ────────────────────────────────────── */}
      <nav className="l-nav">
        <div className="container">
          <div className="l-nav-inner">
            <div className="l-logo">
              <div className="l-logo-icon" style={{ overflow: 'hidden' }}>
                <Image src="/logo.png" alt="Logo" width={20} height={20} className="object-cover" />
              </div>
              Cab Reimbursement System
            </div>
            {status !== "loading" ? (
              session ? (
                <button
                  onClick={() => (window.location.href = "/dashboard")}
                  className="l-nav-btn"
                >
                  Dashboard <RiArrowRightLine size={14} />
                </button>
              ) : (
                <button onClick={() => signIn("google")} className="l-nav-btn">
                  Sign in
                </button>
              )
            ) : (
              <button className="l-nav-btn" style={{ opacity: 0 }}>
                Sign in
              </button>
            )}
          </div>
        </div>
      </nav>

      {/* ── Hero Section ──────────────────────────────────── */}
      <section className="l-hero">
        {/* Background effects */}
        <div className="l-hero-bg">
          <div className="l-hero-gradient" />
          <div className="l-hero-grid" />
          <div className="l-hero-noise" />
          <div className="l-orb l-orb-1" />
          <div className="l-orb l-orb-2" />
          <div className="l-orb l-orb-3" />
        </div>

        {/* Hero content */}
        <motion.div
          className="l-hero-content"
          initial="hidden"
          animate="visible"
          variants={stagger}
        >
          <motion.h1 variants={fadeUp} custom={0}>
            Your cab receipts. <br />
            <span className="l-gradient-text">One report. Zero effort.</span>
          </motion.h1>

          <motion.p className="l-hero-sub" variants={fadeUp} custom={1}>
            Connect your Gmail once. We find every cab receipt, extract the
            details, and deliver a polished PDF + spreadsheet — ready to submit
            for reimbursement.
          </motion.p>

          <motion.div
            variants={fadeUp}
            custom={2}
            style={{
              display: "flex",
              gap: 16,
              justifyContent: "center",
              flexWrap: "wrap",
            }}
          >
            <button onClick={handleCTA} className="l-hero-cta">
              <RiGoogleLine size={22} />
              {session ? "Open Dashboard" : "Connect Gmail — It's Free"}
            </button>
            <a href="#how-it-works" className="l-hero-cta-secondary">
              See how it works <RiArrowDownLine size={16} />
            </a>
          </motion.div>
        </motion.div>

        {/* Hero mockup - the product preview */}
        <motion.div
          className="l-hero-mockup"
          initial={{ opacity: 0, y: 50 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{
            duration: 0.8,
            delay: 0.5,
            ease: [0.25, 0.46, 0.45, 0.94],
          }}
        >
          {/* Floating receipt snippets */}
          <motion.div
            className="l-float-receipt l-float-receipt-1"
            initial={{ opacity: 0, x: -40 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.6, delay: 1.0 }}
          >
            <div
              className="l-fr-icon"
              style={{ background: "rgba(255,255,255,0.08)", color: "#fff" }}
            >
              U
            </div>
            <div className="l-fr-amount">₹342</div>
            <div className="l-fr-label">Uber ride</div>
          </motion.div>

          <motion.div
            className="l-float-receipt l-float-receipt-2"
            initial={{ opacity: 0, x: 40 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.6, delay: 1.2 }}
          >
            <div
              className="l-fr-icon"
              style={{ background: "rgba(52,211,153,0.12)", color: "#34D399" }}
            >
              O
            </div>
            <div className="l-fr-amount">₹215</div>
            <div className="l-fr-label">Ola ride</div>
          </motion.div>

          <motion.div
            className="l-float-receipt l-float-receipt-3"
            initial={{ opacity: 0, x: -30 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.6, delay: 1.4 }}
          >
            <div
              className="l-fr-icon"
              style={{ background: "rgba(251,191,36,0.12)", color: "#FBBF24" }}
            >
              R
            </div>
            <div className="l-fr-amount">₹567</div>
            <div className="l-fr-label">Rapido ride</div>
          </motion.div>

          {/* Main mockup window */}
          <div className="l-mockup-window">
            <div className="l-mockup-titlebar">
              <div className="l-mockup-dot" />
              <div className="l-mockup-dot" />
              <div className="l-mockup-dot" />
              <span className="l-mockup-title">
                Your Expense Report — March 2026
              </span>
              <div style={{ width: 36 }} />
            </div>
            <div className="l-mockup-body">
              <div className="l-mockup-header-row">
                <span>Date</span>
                <span>Route</span>
                <span>Platform</span>
                <span style={{ textAlign: "right" }}>Amount</span>
              </div>
              {mockRows.map((row, i) => (
                <motion.div
                  key={i}
                  className="l-mockup-row"
                  initial={{ opacity: 0, x: -10 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ duration: 0.4, delay: 0.8 + i * 0.1 }}
                >
                  <span className="l-row-date">{row.date}</span>
                  <span className="l-row-route">
                    {row.from} → {row.to}
                  </span>
                  <span>
                    <span className={`l-row-platform ${row.cls}`}>
                      {row.platform}
                    </span>
                  </span>
                  <span className="l-row-amount" style={{ textAlign: "right" }}>
                    {row.amount}
                  </span>
                </motion.div>
              ))}
              <div className="l-mockup-footer">
                <div className="l-mockup-total">
                  Total <strong>₹1,736</strong>
                </div>
                <div className="l-mockup-download">
                  <RiFilePdf2Line size={14} /> Download PDF + Excel
                </div>
              </div>
            </div>
          </div>
        </motion.div>
      </section>

      {/* ── Connectors Strip ──────────────────────────────── */}
      <section className="l-connectors">
        <div className="container">
          <motion.p
            className="l-connectors-label"
            initial={{ opacity: 0 }}
            whileInView={{ opacity: 1 }}
            viewport={{ once: true }}
          >
            Extracts receipts from
          </motion.p>

          <motion.div
            className="l-brand-grid"
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true, margin: "-60px" }}
            variants={stagger}
          >
            {/* Uber */}
            <motion.div
              className="l-brand-card l-brand-uber"
              variants={fadeUp}
              custom={0}
            >
              <div className="l-brand-logo-area">
                {/* Uber app-icon style mark: black pill with official SiUber wordmark */}
                <div className="l-uber-mark">
                  <SiUber size={36} color="#fff" />
                </div>
              </div>
              <div className="l-brand-info">
                <span className="l-brand-name">Uber</span>
                <span className="l-brand-status">
                  <span className="l-status-dot l-dot-uber" /> Receipts synced
                </span>
              </div>
            </motion.div>

            {/* Ola */}
            <motion.div
              className="l-brand-card l-brand-ola"
              variants={fadeUp}
              custom={1}
            >
              <div className="l-brand-logo-area">
                <div className="l-ola-logo-pill">
                  <Image
                    src="/ola.svg"
                    alt="Ola"
                    className="l-brand-img l-ola-img"
                    width={120}
                    height={40}
                  />
                </div>
              </div>
              <div className="l-brand-info">
                <span className="l-brand-name" style={{ color: "#D7DF20" }}>
                  Ola
                </span>
                <span className="l-brand-status">
                  <span className="l-status-dot l-dot-ola" /> Receipts synced
                </span>
              </div>
            </motion.div>

            {/* Rapido */}
            <motion.div
              className="l-brand-card l-brand-rapido"
              variants={fadeUp}
              custom={2}
            >
              <div className="l-brand-logo-area">
                <Image
                  src="/rapido.svg"
                  alt="Rapido"
                  className="l-brand-img l-rapido-img"
                  width={120}
                  height={40}
                />
              </div>
              <div className="l-brand-info">
                <span className="l-brand-name" style={{ color: "#FFCC00" }}>
                  Rapido
                </span>
                <span className="l-brand-status">
                  <span className="l-status-dot l-dot-rapido" /> Receipts synced
                </span>
              </div>
            </motion.div>
          </motion.div>
          <motion.p
            className="l-connectors-more-note"
            initial={{ opacity: 0 }}
            whileInView={{ opacity: 1 }}
            viewport={{ once: true }}
            transition={{ delay: 0.4 }}
          >
            More platforms coming soon
          </motion.p>
        </div>
      </section>

      {/* ── How It Works ──────────────────────────────────── */}
      <section className="l-how" id="how-it-works">
        <div className="container">
          <motion.div
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true, margin: "-80px" }}
            variants={stagger}
            style={{ textAlign: "center", maxWidth: 600, margin: "0 auto" }}
          >
            <motion.p className="l-section-label" variants={fadeUp} custom={0}>
              How it works
            </motion.p>
            <motion.h2 className="l-section-title" variants={fadeUp} custom={1}>
              Three steps. That&apos;s it.
            </motion.h2>
            <motion.p
              className="l-section-sub"
              variants={fadeUp}
              custom={2}
              style={{ margin: "0 auto" }}
            >
              No setup wizards. No configuration. No learning curve. Connect,
              extract, download.
            </motion.p>
          </motion.div>

          <div className="l-how-grid">
            {steps.map((step, i) => (
              <motion.div
                key={step.num}
                className="l-how-card"
                initial={{ opacity: 0, y: 30 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true, margin: "-50px" }}
                transition={{ duration: 0.5, delay: i * 0.15 }}
              >
                <div className="l-how-number">{step.num}</div>
                <h3>{step.title}</h3>
                <p>{step.description}</p>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* ── Features Bento Grid ───────────────────────────── */}
      <section className="l-features">
        <div className="container">
          <motion.div
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true, margin: "-80px" }}
            variants={stagger}
            style={{ textAlign: "center", maxWidth: 600, margin: "0 auto" }}
          >
            <motion.p className="l-section-label" variants={fadeUp} custom={0}>
              Features
            </motion.p>
            <motion.h2 className="l-section-title" variants={fadeUp} custom={1}>
              Everything you need. Nothing you don&apos;t.
            </motion.h2>
            <motion.p
              className="l-section-sub"
              variants={fadeUp}
              custom={2}
              style={{ margin: "0 auto" }}
            >
              Built for the monthly grind of expense reporting. We handle the
              tedious parts so you never have to.
            </motion.p>
          </motion.div>

          <div className="l-bento">
            {features.map((f, i) => (
              <motion.div
                key={f.title}
                className="l-bento-card"
                initial={{ opacity: 0, y: 24 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true, margin: "-40px" }}
                transition={{ duration: 0.5, delay: i * 0.08 }}
              >
                <div className={`l-bento-icon ${f.iconClass}`}>
                  <f.icon size={22} />
                </div>
                <h3>{f.title}</h3>
                <p>{f.description}</p>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* ── Security Section ──────────────────────────────── */}
      <section className="l-security">
        <div className="container">
          <motion.div
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true, margin: "-80px" }}
            variants={stagger}
          >
            <motion.p className="l-section-label" variants={fadeUp} custom={0}>
              Security
            </motion.p>
            <motion.h2 className="l-section-title" variants={fadeUp} custom={1}>
              Your privacy is non-negotiable.
            </motion.h2>
            <motion.p
              className="l-section-sub"
              variants={fadeUp}
              custom={2}
              style={{ margin: "0 auto" }}
            >
              We take the minimum access we need and nothing more. Your inbox
              stays yours.
            </motion.p>
          </motion.div>

          <div className="l-security-grid">
            {securityItems.map((item, i) => (
              <motion.div
                key={item.title}
                className="l-security-item"
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ duration: 0.5, delay: i * 0.12 }}
              >
                <div className="l-security-icon">
                  <item.icon size={26} />
                </div>
                <h4>{item.title}</h4>
                <p>{item.description}</p>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* ── Final CTA ─────────────────────────────────────── */}
      <section className="l-cta">
        <div className="l-cta-bg" />
        <div className="container" style={{ position: "relative", zIndex: 1 }}>
          <motion.div
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true, margin: "-60px" }}
            variants={stagger}
          >
            <motion.h2 variants={fadeUp} custom={0}>
              Your finance team
              <br />
              will thank you.
            </motion.h2>
            <motion.p variants={fadeUp} custom={1}>
              Stop spending hours compiling cab receipts. Automate it in 30
              seconds.
            </motion.p>
            <motion.div variants={fadeUp} custom={2}>
              <button onClick={handleCTA} className="l-hero-cta">
                <RiGoogleLine size={22} />
                {session ? "Go to Dashboard" : "Get Started — It's Free"}
              </button>
            </motion.div>
          </motion.div>
        </div>
      </section>

      {/* ── Footer ────────────────────────────────────────── */}
      <footer className="l-footer">
        <div className="l-footer-inner">
          <div className="l-footer-left">
            <div className="l-footer-logo">
              <TbReceipt2 size={16} color="#fff" />
            </div>
            <span className="l-footer-copy" suppressHydrationWarning>
              © {new Date().getFullYear()} Cab Reimbursement System. All rights reserved.
            </span>
          </div>
          <div className="l-footer-links">
            <Link href="/privacy">Privacy</Link>
            <Link href="/terms">Terms</Link>
            <a href="#">Contact</a>
          </div>
        </div>
      </footer>
    </div>
  );
}
