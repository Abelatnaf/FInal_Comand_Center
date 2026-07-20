import Link from "next/link";

export const metadata = { title: "Terms of Service — Command Deck" };

export default function TermsPage() {
  return (
    <div className="min-h-screen px-5 py-12">
      <div className="max-w-2xl mx-auto">
        <Link href="/login" className="link-action text-[14px]">
          ← Back
        </Link>

        <h1 className="ios-large-title mt-4 mb-1">Terms of Service</h1>
        <p className="ios-footnote text-text-faint mb-8">Last updated July 20, 2026</p>

        <div className="glass p-5 mb-8">
          <p className="ios-footnote text-text-dim">
            Command Deck is a small, independently-run tool, not a commercial product backed by a company or legal
            team. These terms are written in plain language to set honest expectations, not as a lawyer-drafted
            contract.
          </p>
        </div>

        <div className="flex flex-col gap-6 ios-body text-text-dim">
          <section>
            <h2 className="ios-title3 text-text mb-2">What this is</h2>
            <p>
              Command Deck is a manual personal-finance tracker. You type in your own transactions, income, and
              balances; the app computes rollups, budgets, and net worth from what you enter. It does not connect to
              your bank, does not move money, and does not provide financial, tax, or investment advice.
            </p>
          </section>

          <section>
            <h2 className="ios-title3 text-text mb-2">Your responsibility</h2>
            <p>
              You&apos;re responsible for the accuracy of what you enter and for keeping your password secure.
              Anyone who gains access to your account can see and edit everything in it.
            </p>
          </section>

          <section>
            <h2 className="ios-title3 text-text mb-2">No warranty</h2>
            <p>
              This app is provided as-is, without warranty of any kind. It&apos;s actively developed by one person as
              a personal project that other people are also welcome to use. Bugs happen; back up anything important
              using the Export feature in Settings.
            </p>
          </section>

          <section>
            <h2 className="ios-title3 text-text mb-2">Limitation of liability</h2>
            <p>
              To the fullest extent permitted by law, the operator of this app is not liable for any loss, damage, or
              financial decision made using data from this app, including data loss, downtime, or calculation errors.
              Nothing here should be your sole source of truth for tax filings or financial decisions — verify
              against your actual bank and brokerage statements.
            </p>
          </section>

          <section>
            <h2 className="ios-title3 text-text mb-2">Account termination</h2>
            <p>
              You can request your account be deleted at any time by contacting the app operator at your account
              email. We may suspend or remove accounts that abuse the service (attempting to access other
              users&apos; data, disrupting the app for others, or similar). If that happens, we&apos;ll try to
              notify you at your account email first.
            </p>
          </section>

          <section>
            <h2 className="ios-title3 text-text mb-2">Changes</h2>
            <p>
              These terms may change as the app evolves. Material changes will be reflected here with an updated
              date at the top of this page.
            </p>
          </section>

          <section>
            <h2 className="ios-title3 text-text mb-2">Contact</h2>
            <p>Questions about these terms can be sent to the app operator via your account email.</p>
          </section>
        </div>
      </div>
    </div>
  );
}
