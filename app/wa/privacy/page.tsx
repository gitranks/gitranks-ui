import type { Metadata } from 'next';

import { Header } from '@/components/header/header';

export const metadata: Metadata = {
  title: 'Privacy Policy - GitRanks Chatbot (Sole Proprietor Vitalii Maslianok)',
  description: 'Privacy Policy for the WhatsApp chatbot operated by sole proprietor Vitalii Maslianok.',
};

export default function PrivacyPolicy() {
  return (
    <>
      <Header />
      <main className="max-w-3xl mx-auto px-4 py-12 leading-relaxed space-y-10">
        {/* Heading */}
        <header className="space-y-2">
          <h1 className="text-3xl md:text-4xl font-extrabold">
            Privacy Policy for <span className="font-semibold">GitRanks Chatbot</span>
          </h1>
          <p className="italic text-sm">Effective date: 21 June 2025</p>
        </header>

        {/* 1. Who we are */}
        <section className="space-y-4">
          <h2 className="text-2xl font-bold">1. Who we are</h2>
          <p>
            <span className="font-medium">Vitalii Maslianok, Sole Proprietor </span> (&quot;we&quot;, &quot;our&quot;,
            &quot;us&quot;) operates the WhatsApp chatbot <span className="font-medium">GitRanks Chatbot</span>.&nbsp;
            You can reach us at&nbsp;
            <a href="mailto:maslianok@gmail.com" className="underline">
              maslianok@gmail.com
            </a>
            .
          </p>
        </section>

        {/* 2. What data we collect */}
        <section className="space-y-4">
          <h2 className="text-2xl font-bold">2. What data we collect</h2>
          <div className="overflow-x-auto">
            <table className="w-full table-auto border text-sm">
              <thead>
                <tr className="border-b">
                  <th className="p-2 text-left font-medium">Category</th>
                  <th className="p-2 text-left font-medium">Examples</th>
                  <th className="p-2 text-left font-medium">Retention</th>
                </tr>
              </thead>
              <tbody>
                <tr className="border-b">
                  <td className="p-2 font-semibold">WhatsApp account data</td>
                  <td className="p-2">User phone number</td>
                  <td className="p-2">
                    Kept until the user sends <strong>STOP</strong>
                  </td>
                </tr>
                <tr className="border-b">
                  <td className="p-2 font-semibold">Subscription preferences</td>
                  <td className="p-2">GitHub username(s) the user follows</td>
                  <td className="p-2">Kept until user unsubscribes</td>
                </tr>
              </tbody>
            </table>
          </div>
          <p>
            We do <strong>not</strong> persist message content; it is processed in memory only to generate an immediate
            reply.
          </p>
        </section>

        {/* 3. How we use the data */}
        <section className="space-y-4">
          <h2 className="text-2xl font-bold">3. How we use the data</h2>
          <ul className="list-disc pl-6 space-y-2">
            <li>To deliver the chatbot service and GitHub update notifications the user requests</li>
            <li>To maintain the security and reliability of the service (e.g., debugging, abuse prevention)</li>
          </ul>
        </section>

        {/* 4. Legal bases */}
        <section className="space-y-4">
          <h2 className="text-2xl font-bold">4. Legal bases (GDPR)</h2>
          <ul className="list-disc pl-6 space-y-2">
            <li>
              <strong>Consent</strong> – when the user sends <code className="px-1 py-0.5 rounded">➕ Subscribe</code>,
              they consent to receiving updates.
            </li>
            <li>
              <strong>Legitimate interest</strong> – minimal logging to keep the service secure and functioning.
            </li>
          </ul>
        </section>

        {/* 5. How we store and protect data */}
        <section className="space-y-4">
          <h2 className="text-2xl font-bold">5. How we store and protect data</h2>
          <p>
            Data is stored on <span className="font-medium">Digital Ocean Amsterdam Datacenter-3</span>
            &nbsp;in encrypted databases and is never sold. Access is restricted to authorised personnel only.
          </p>
        </section>

        {/* 6. Sharing with third parties */}
        <section className="space-y-4">
          <h2 className="text-2xl font-bold">6. Sharing with third parties</h2>
          <ul className="list-disc pl-6 space-y-2">
            <li>
              <strong>WhatsApp / Meta</strong> – message delivery (end‑to‑end encrypted).
            </li>
            <li>
              <strong>Service providers</strong> – only where strictly necessary for hosting or analytics, bound by
              confidentiality agreements.
            </li>
          </ul>
          <p>We do not share data for advertising purposes.</p>
        </section>

        {/* 7. How long we keep data */}
        <section className="space-y-4">
          <h2 className="text-2xl font-bold">7. How long we keep data</h2>
          <p>
            See the Retention column in §2. When a user requests deletion, their phone number and preferences are
            removed within <strong>[48 hours]</strong> and backups within <strong>30 days</strong>.
          </p>
        </section>

        {/* 8. Your rights */}
        <section className="space-y-4">
          <h2 className="text-2xl font-bold">8. Your rights</h2>
          <p>Under applicable law (GDPR/CCPA, etc.) you may:</p>
          <ul className="list-disc pl-6 space-y-2">
            <li>Access the data we hold about you</li>
            <li>Correct or delete your data</li>
            <li>Withdraw consent at any time</li>
          </ul>
          <p>
            To exercise these rights, email us at&nbsp;
            <a href="mailto:maslianok@gmail.com" className="underline">
              maslianok@gmail.com
            </a>
            .
          </p>
        </section>

        {/* 9. Changes to this policy */}
        <section className="space-y-4">
          <h2 className="text-2xl font-bold">9. Changes to this policy</h2>
          <p>We may update this policy from time to time. The “Effective date” will be revised.</p>
        </section>

        {/* 10. Contact */}
        <section className="space-y-4">
          <h2 className="text-2xl font-bold">10. Contact</h2>
          <p>
            Questions? Email&nbsp;
            <a href="mailto:maslianok@gmail.com" className="underline">
              maslianok@gmail.com
            </a>
            .
          </p>
        </section>
      </main>
    </>
  );
}
