import React from 'react';
import Link from 'next/link';

export default function PrivacyPolicy() {
  return (
    <div className="max-w-4xl mx-auto px-6 py-12 text-zinc-300">
      <h1 className="text-4xl font-bold text-white mb-8">Privacy Policy</h1>
      <p className="mb-4 text-zinc-400">Last Updated: March 24, 2026</p>

      <section className="mb-8">
        <h2 className="text-2xl font-semibold text-white mb-4">1. Overview</h2>
        <p>
          Cab Reimbursement System ("we", "us", or "our") is committed to protecting your privacy. This Privacy Policy explains how we collect, use, and safeguard your information when you use our application to automate cab reimbursement reports.
        </p>
      </section>

      <section className="mb-8">
        <h2 className="text-2xl font-semibold text-white mb-4">2. Gmail Data Access & Usage</h2>
        <p className="mb-4">
          Our application requests Restricted Scopes (e.g., <code>https://www.googleapis.com/auth/gmail.readonly</code>) to help you find and process cab receipts. Specifically:
        </p>
        <ul className="list-disc pl-6 space-y-2">
          <li><strong>What we access:</strong> We only search for and read emails from specific cab service providers such as Uber (<code>noreply@uber.com</code>), Rapido (<code>shoutout@rapido.bike</code>), and Ola.</li>
          <li><strong>What we extract:</strong> We extract ride details including date, amount, pickup/drop locations, and receipt links.</li>
          <li><strong>How we use it:</strong> This data is used solely to generate a reimbursement report in the format you require.</li>
        </ul>
      </section>

      <section className="mb-8">
        <h2 className="text-2xl font-semibold text-white mb-4">3. Data Storage & Security</h2>
        <p>
          We do not store your raw email content on our servers. Processing occurs in real-time. Any extracted reimbursement metadata is stored locally within your secure session or explicitly exported by you. We implement industry-standard security measures to protect your access tokens and session data.
        </p>
      </section>

      <section className="mb-8">
        <h2 className="text-2xl font-semibold text-white mb-4">4. No Data Sharing & Commercial Use</h2>
        <p>
          <strong>We do not sell, trade, or otherwise transfer your data to third parties.</strong> Our use of information received from Google APIs will adhere to the <a href="https://developers.google.com/terms/api-services-user-data-policy" className="text-blue-400 hover:underline">Google API Services User Data Policy</a>, including the Limited Use requirements.
        </p>
      </section>

      <section className="mb-8">
        <h2 className="text-2xl font-semibold text-white mb-4">5. Your Consent</h2>
        <p>
          By using our application and signing in with Google, you consent to the collection and use of your data as described in this policy. You can revoke access at any time through your Google Account security settings.
        </p>
      </section>

      <div className="mt-12 pt-8 border-t border-zinc-800">
        <Link href="/" className="text-blue-400 hover:underline">
          &larr; Back to Home
        </Link>
      </div>
    </div>
  );
}
