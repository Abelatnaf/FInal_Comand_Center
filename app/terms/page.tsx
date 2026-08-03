import Link from "next/link";

export const metadata = { title: "Terms of Service — Command Deck" };

export default function TermsPage() {
  return (
    <div className="min-h-screen px-5 py-12">
      <div className="max-w-2xl mx-auto">
        <Link href="/login" className="text-muted text-[14px]">
          ← Back
        </Link>

        <h1 className="text-[28px] font-semibold text-text mt-4 mb-1">Terms of Service</h1>
        <p className="text-[13px] text-faint mb-8">Last updated August 3, 2026</p>

        <div className="card row mb-8">
          <p className="text-[14px] text-muted">
            Command Deck is a small, independent app, not a commercial product backed by a company or legal team.
            These terms are written in plain language to set honest expectations.
          </p>
        </div>

        <div className="flex flex-col gap-6 text-[15px] text-muted">
          <section>
            <h2 className="text-[17px] font-medium text-text mb-2">What this is</h2>
            <p>
              Command Deck is an expense tracker. You enter your own transactions, or import them from a CSV file
              you download yourself; the app adds them up. It does not connect to your bank, never asks for bank
              credentials, does not move money, and does not provide financial, tax, or investment advice. The
              &ldquo;possibly tax deductible&rdquo; flag is a label you apply for your own records — it is not a
              judgement about what actually qualifies.
            </p>
          </section>

          <section>
            <h2 className="text-[17px] font-medium text-text mb-2">Your responsibility</h2>
            <p>
              You&apos;re responsible for the accuracy of what you enter and for keeping your password secure.
              Anyone who gains access to your account, or to a read-only share link you create, can see what it
              covers. Share links can be revoked at any time in Settings.
            </p>
          </section>

          <section>
            <h2 className="text-[17px] font-medium text-text mb-2">No warranty</h2>
            <p>
              This app is provided as-is, without warranty of any kind. Bugs happen; back up anything important using
              the export feature in Settings.
            </p>
          </section>

          <section>
            <h2 className="text-[17px] font-medium text-text mb-2">Limitation of liability</h2>
            <p>
              To the fullest extent permitted by law, the operator of this app is not liable for any loss, damage, or
              financial decision made using data from this app, including data loss, downtime, or calculation errors.
              Nothing here should be your sole source of truth — verify against your actual bank and billing
              statements before making a decision that matters.
            </p>
          </section>

          <section>
            <h2 className="text-[17px] font-medium text-text mb-2">Changes</h2>
            <p>
              These terms may change as the app evolves. Material changes will be reflected here with an updated date
              at the top of this page.
            </p>
          </section>
        </div>
      </div>
    </div>
  );
}
