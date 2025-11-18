import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Privacy Policy | EternalBotanic",
  description:
    "How EternalBotanic collects, uses, and protects your personal information, plus your choices and rights.",
};

export default function PrivacyPolicyPage() {
  return (
    <main className="max-w-3xl mx-auto px-4 py-12 text-sm leading-6 text-muted-foreground">
      <h1 className="text-2xl font-bold mb-6 text-foreground">
        Privacy Policy
      </h1>

      <p className="mb-4">
        This Policy explains how EternalBotanic collects, uses, and safeguards
        personal information when you visit our website, make a purchase, or
        contact us.
      </p>

      <h2 className="font-semibold text-foreground mt-6 mb-2">
        Information We Collect
      </h2>
      <ul className="list-disc ml-5 mb-4 space-y-1">
        <li>
          Account and contact details (name, email, shipping address, phone).
        </li>
        <li>
          Order and payment info (order contents, totals, limited payment
          metadata handled by our payment processor; we do not store full card
          numbers).
        </li>
        <li>
          Site usage data (cookies, device/browser info, IP, pages viewed).
        </li>
        <li>Messages you send via forms or email.</li>
      </ul>

      <h2 className="font-semibold text-foreground mt-6 mb-2">
        How We Use Information
      </h2>
      <ul className="list-disc ml-5 mb-4 space-y-1">
        <li>
          Process and deliver orders, provide customer support, and operate the
          site.
        </li>
        <li>Send transactional emails and, with consent, marketing updates.</li>
        <li>
          Prevent fraud, secure our services, and comply with legal obligations.
        </li>
        <li>Analyze performance to improve products and site experience.</li>
      </ul>

      <h2 className="font-semibold text-foreground mt-6 mb-2">
        Cookies and Analytics
      </h2>
      <p className="mb-4">
        We use cookies and similar technologies for core functionality,
        preferences, analytics, and performance. You can control cookies in your
        browser. If you use an ad blocker or reject cookies, some features may
        not work.
      </p>

      <h2 className="font-semibold text-foreground mt-6 mb-2">Payments</h2>
      <p className="mb-4">
        Payments are processed by our payment provider (e.g., Stripe). Your card
        details are submitted directly to the provider and are not stored on our
        servers. The provider’s use of your data is governed by their privacy
        policy.
      </p>

      <h2 className="font-semibold text-foreground mt-6 mb-2">Data Sharing</h2>
      <p className="mb-4">
        We do not sell or rent personal information. We share limited data with
        service providers who help operate our site, process payments, fulfill
        orders, deliver emails, and provide analytics. These providers must keep
        data confidential and use it only as instructed.
      </p>

      <h2 className="font-semibold text-foreground mt-6 mb-2">
        Data Retention
      </h2>
      <p className="mb-4">
        We retain personal information only as long as needed for the purposes
        above, to comply with legal obligations, resolve disputes, and enforce
        agreements. Order records may be kept as required by tax and accounting
        law.
      </p>

      <h2 className="font-semibold text-foreground mt-6 mb-2">
        Your Rights and Choices
      </h2>
      <ul className="list-disc ml-5 mb-4 space-y-1">
        <li>Access, update, or delete certain information by contacting us.</li>
        <li>
          Opt out of marketing emails at any time via the unsubscribe link.
        </li>
        <li>
          Residents of some regions (e.g., EU/UK, California) may have
          additional rights such as data portability or limiting certain uses.
        </li>
      </ul>

      <h2 className="font-semibold text-foreground mt-6 mb-2">Security</h2>
      <p className="mb-4">
        We use administrative, technical, and physical safeguards to protect
        personal information. No method of transmission or storage is 100%
        secure.
      </p>

      <h2 className="font-semibold text-foreground mt-6 mb-2">
        International Transfers
      </h2>
      <p className="mb-4">
        If you access the site from outside the United States, your information
        may be processed in the U.S. and other countries with different data
        protection laws.
      </p>

      <h2 className="font-semibold text-foreground mt-6 mb-2">Children</h2>
      <p className="mb-4">
        Our site is not directed to children under 13, and we do not knowingly
        collect personal information from children.
      </p>

      <h2 className="font-semibold text-foreground mt-6 mb-2">Contact</h2>
      <p className="mb-4">
        For privacy questions or requests, contact us at{" "}
        <a href="mailto:eternalbotanic@gmail.com" className="underline">
          eternalbotanic@gmail.com
        </a>{" "}
        or use the contact form on our site.
      </p>

      <h2 className="font-semibold text-foreground mt-6 mb-2">
        Region-Specific Notices
      </h2>
      <p className="mb-2">
        California residents: You may have rights under the CCPA/CPRA. Use the
        contact above to request access, deletion, or to opt out of sale/share
        of personal information. We do not sell personal information in the
        ordinary sense. If we use advertising that may be deemed “sharing,” you
        can manage preferences via cookie controls.
      </p>
      <p className="mb-4">
        EU/UK residents: Our legal bases include contract, consent, legitimate
        interests, and legal obligations. You may have rights to access,
        rectify, erase, restrict, or object to processing, and to data
        portability and lodging a complaint with your local authority.
      </p>

      <h2 className="font-semibold text-foreground mt-6 mb-2">Changes</h2>
      <p className="mb-4">
        We may update this Policy. Changes take effect when posted here. If
        changes are material, we will provide a prominent notice.
      </p>

      <p className="mt-8 text-xs text-gray-400">Effective: June 17, 2025</p>
      <p className="text-xs text-gray-400">Last updated: August 18, 2025</p>
    </main>
  );
}
