import React from 'react';
import Link from 'next/link';

export default function TermsOfService() {
  return (
    <div className="max-w-4xl mx-auto px-6 py-12 text-zinc-300">
      <h1 className="text-4xl font-bold text-white mb-8">Terms of Service</h1>
      <p className="mb-4 text-zinc-400">Last Updated: March 24, 2026</p>

      <section className="mb-8">
        <h2 className="text-2xl font-semibold text-white mb-4">1. Acceptance of Terms</h2>
        <p>
          By accessing or using the Cab Reimbursement System ("Service"), you agree to be bound by these Terms of Service. If you do not agree to these terms, please do not use the Service.
        </p>
      </section>

      <section className="mb-8">
        <h2 className="text-2xl font-semibold text-white mb-4">2. Description of Service</h2>
        <p>
          The Service provides an automated tool to scan your Gmail account for cab receipts (e.g., Uber, Ola, Rapido) and generate reimbursement reports. The Service requires your explicit consent via Google OAuth to operate.
        </p>
      </section>

      <section className="mb-8">
        <h2 className="text-2xl font-semibold text-white mb-4">3. User Responsibilities</h2>
        <p>
          You are responsible for:
        </p>
        <ul className="list-disc pl-6 mt-2 space-y-2">
          <li>Ensuring the accuracy of the data extracted before submitting it for reimbursement to your organization.</li>
          <li>Maintaining the security of your Google account and any access tokens granted to the Service.</li>
          <li>Complying with your employer's internal policies regarding cab reimbursement.</li>
        </ul>
      </section>

      <section className="mb-8">
        <h2 className="text-2xl font-semibold text-white mb-4">4. Limitations of Liability</h2>
        <p>
          The Service is provided "as is" without any warranties. We are not liable for:
        </p>
        <ul className="list-disc pl-6 mt-2 space-y-2">
          <li>Any errors in data extraction or missing receipts.</li>
          <li>The rejection of any reimbursement claims by your employer or any third party.</li>
          <li>Any indirect, incidental, or consequential damages arising from your use of the Service.</li>
        </ul>
      </section>

      <section className="mb-8">
        <h2 className="text-2xl font-semibold text-white mb-4">5. Intellectual Property</h2>
        <p>
          All software, design, and content of the Service (excluding your personal email data) are the intellectual property of Cab Reimbursement System. You are granted a limited, non-exclusive license to use the Service.
        </p>
      </section>

      <section className="mb-8">
        <h2 className="text-2xl font-semibold text-white mb-4">6. Termination</h2>
        <p>
          We reserve the right to suspend or terminate your access to the Service at any time, with or without notice, for any reason, including violation of these terms. You may stop using the Service at any time by revoking access in your Google Account settings.
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
