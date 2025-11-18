import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Terms and Conditions | EternalBotanic",
  description:
    "Terms governing use of the EternalBotanic website, purchases, and services.",
};

export default function TermsPage() {
  return (
    <main className="max-w-4xl mx-auto px-4 py-12 text-xs leading-relaxed text-muted-foreground">
      <h1 className="text-lg font-semibold text-foreground mb-4">
        Terms and Conditions
      </h1>

      <p className="mb-3">
        By accessing or using this website (the “Site”), you agree to these
        Terms and Conditions (“Terms”). If you do not agree, do not use the
        Site.
      </p>

      <h2 className="font-medium text-foreground mt-6 mb-2">
        1. Eligibility & Accounts
      </h2>
      <p className="mb-3">
        You must be at least 13 years old to use the Site and at least 18 to
        make purchases. If you create an account, you are responsible for
        maintaining its security and for all activity under it.
      </p>

      <h2 className="font-medium text-foreground mt-6 mb-2">
        2. Orders, Pricing, and Payments
      </h2>
      <ul className="list-disc ml-5 mb-3 space-y-1">
        <li>
          Prices, promotions, and availability may change without notice. We may
          refuse or cancel any order and will refund any payment received for
          canceled orders.
        </li>
        <li>
          You authorize us and our payment processor to charge the payment
          method you provide for the total order amount, including taxes,
          shipping, and fees.
        </li>
        <li>
          We do not store full card numbers; payments are handled by our
          processor subject to their terms and privacy policy.
        </li>
      </ul>

      <h2 className="font-medium text-foreground mt-6 mb-2">
        3. Shipping, Risk of Loss, and Returns
      </h2>
      <ul className="list-disc ml-5 mb-3 space-y-1">
        <li>
          Title and risk of loss pass to you upon our delivery of items to the
          carrier. Delivery dates are estimates, not guarantees.
        </li>
        <li>
          Returns and exchanges are governed by our Return Policy posted on the
          Site. You are responsible for return shipping unless stated otherwise.
        </li>
      </ul>

      <h2 className="font-medium text-foreground mt-6 mb-2">
        4. Product Information
      </h2>
      <p className="mb-3">
        We attempt to be accurate, but we do not warrant that product
        descriptions or other content are complete, current, or error-free.
        Colors may vary by display. Cosmetic products are for external use only.
      </p>

      <h2 className="font-medium text-foreground mt-6 mb-2">
        5. Medical Disclaimer
      </h2>
      <p className="mb-3">
        Content on the Site is for informational purposes only and is not a
        substitute for professional medical advice. Our products are cosmetics
        and are not intended to diagnose, treat, cure, or prevent any disease.
        Always patch test and discontinue use if irritation occurs.
      </p>

      <h2 className="font-medium text-foreground mt-6 mb-2">
        6. Acceptable Use
      </h2>
      <ul className="list-disc ml-5 mb-3 space-y-1">
        <li>No unlawful, harmful, harassing, or infringing activity.</li>
        <li>
          No attempts to disrupt, scrape, reverse engineer, or bypass security.
        </li>
        <li>
          No automated use that degrades the Site or violates robots rules.
        </li>
      </ul>

      <h2 className="font-medium text-foreground mt-6 mb-2">
        7. Intellectual Property
      </h2>
      <p className="mb-3">
        The Site and its content (text, graphics, logos, images, software) are
        owned by EternalBotanic or its licensors and are protected by
        intellectual property laws. You may not copy, modify, distribute, or
        create derivative works without permission.
      </p>

      <h2 className="font-medium text-foreground mt-6 mb-2">8. User Content</h2>
      <p className="mb-3">
        If you submit reviews or other content, you grant EternalBotanic a
        nonexclusive, worldwide, royalty-free license to use, reproduce, modify,
        and display that content in connection with the Site and our business.
        Do not submit content you do not have rights to share.
      </p>

      <h2 className="font-medium text-foreground mt-6 mb-2">
        9. Third-Party Services and Links
      </h2>
      <p className="mb-3">
        The Site may link to third-party websites or services. We are not
        responsible for their content, policies, or practices. Your use of them
        is at your own risk and subject to their terms.
      </p>

      <h2 className="font-medium text-foreground mt-6 mb-2">
        10. Disclaimer of Warranties
      </h2>
      <p className="mb-3">
        The Site and all products and content are provided “as is” and “as
        available.” We disclaim all warranties, express or implied, including
        merchantability, fitness for a particular purpose, title, and
        non-infringement. Use at your own risk.
      </p>

      <h2 className="font-medium text-foreground mt-6 mb-2">
        11. Limitation of Liability
      </h2>
      <p className="mb-3">
        To the maximum extent permitted by law, EternalBotanic and its
        affiliates will not be liable for indirect, incidental, special,
        consequential, exemplary, or punitive damages, or for any loss of
        profits, revenues, data, or goodwill. Our total liability for any claim
        will not exceed the amount you paid for the applicable product or USD
        $100, whichever is greater.
      </p>

      <h2 className="font-medium text-foreground mt-6 mb-2">
        12. Indemnification
      </h2>
      <p className="mb-3">
        You agree to indemnify and hold EternalBotanic and its affiliates
        harmless from claims, damages, losses, liabilities, costs, and expenses
        arising from your use of the Site, your violation of these Terms, or
        your infringement of any rights of a third party.
      </p>

      <h2 className="font-medium text-foreground mt-6 mb-2">
        13. Governing Law; Dispute Resolution
      </h2>
      <p className="mb-3">
        These Terms are governed by the laws of the State of Illinois, without
        regard to conflict of laws. Any dispute will be resolved through binding
        arbitration in Cook County, Illinois, administered by a recognized
        arbitration provider. You and EternalBotanic waive jury trial and class
        actions. You may bring qualifying claims in small-claims court instead.
      </p>

      <h2 className="font-medium text-foreground mt-6 mb-2">
        14. Changes to Terms
      </h2>
      <p className="mb-3">
        We may update these Terms at any time. Changes are effective when posted
        on this page. Continued use of the Site after changes means you accept
        the updated Terms.
      </p>

      <h2 className="font-medium text-foreground mt-6 mb-2">15. Contact</h2>
      <p className="mb-3">
        Questions about these Terms:{" "}
        <a href="mailto:eternalbotanic@gmail.com" className="underline">
          eternalbotanic@gmail.com
        </a>
        .
      </p>

      <p className="mt-10 italic text-[10px]">
        Effective: June 17, 2025 • Last updated: August 18, 2025
      </p>

      <p className="mt-2 text-[10px]">
        This template is provided for general informational purposes and is not
        legal advice. Consult an attorney for requirements applicable to your
        business.
      </p>
    </main>
  );
}
