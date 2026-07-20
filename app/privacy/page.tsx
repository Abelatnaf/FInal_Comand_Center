import Link from "next/link";

export const metadata = { title: "Privacy Policy — Command Deck" };

export default function PrivacyPage() {
  return (
    <div className="min-h-screen px-5 py-12">
      <div className="max-w-2xl mx-auto">
        <Link href="/login" className="link-action text-[14px]">
          ← Back
        </Link>

        <h1 className="ios-large-title mt-4 mb-1">Privacy Policy</h1>
        <p className="ios-footnote text-text-faint mb-8">Last updated July 20, 2026</p>

        <div className="glass p-5 mb-8">
          <p className="ios-footnote text-text-dim">
            Command Deck is a small, independently-run personal finance tool. This page describes what actually
            happens to your data in plain language — it has not been drafted or reviewed by a lawyer. If you need
            this to satisfy a specific legal or compliance requirement, have your own counsel review it.
          </p>
        </div>

        <div className="flex flex-col gap-6 ios-body text-text-dim">
          <section>
            <h2 className="ios-title3 text-text mb-2">What we collect</h2>
            <p>
              Your email address and password (used only to authenticate you — see below), and whatever financial
              data you choose to enter: transactions, accounts, balances, budgets, and savings goals. We don&apos;t
              collect anything beyond what you type in.
            </p>
          </section>

          <section>
            <h2 className="ios-title3 text-text mb-2">How your password is handled</h2>
            <p>
              Authentication is handled by Supabase Auth. Your password is hashed before storage — we never see or
              store it in plain text, and nobody with database access can read it back out.
            </p>
          </section>

          <section>
            <h2 className="ios-title3 text-text mb-2">Where your data lives</h2>
            <p>
              All data is stored in a Postgres database hosted by Supabase, with the app itself hosted on Vercel.
              Every row you create is scoped to your account with row-level security — other users of this app
              cannot read or write your data, and we have not built any admin panel or back-office view into
              anyone&apos;s financial data.
            </p>
          </section>

          <section>
            <h2 className="ios-title3 text-text mb-2">What we don&apos;t do</h2>
            <p>
              We don&apos;t sell your data. We don&apos;t share it with advertisers or data brokers. We don&apos;t
              connect to your bank (there is no Plaid or similar integration) — every entry is typed in by you. We
              don&apos;t use your financial data to train any model.
            </p>
          </section>

          <section>
            <h2 className="ios-title3 text-text mb-2">Cookies</h2>
            <p>
              The only cookies this app sets are the ones Supabase Auth uses to keep you signed in. There is no
              advertising or analytics tracking.
            </p>
          </section>

          <section>
            <h2 className="ios-title3 text-text mb-2">Your data, your control</h2>
            <p>
              You can export everything you&apos;ve logged as a single JSON file at any time from Settings → Account
              → Export All Data. If you&apos;d like your account and its data deleted, contact the email address you
              used to sign up.
            </p>
          </section>

          <section>
            <h2 className="ios-title3 text-text mb-2">Questions</h2>
            <p>
              This app is run by one person, not a company. If you have questions about your data, reach out to the
              email address you used to sign up, or contact the app&apos;s operator directly.
            </p>
          </section>
        </div>
      </div>
    </div>
  );
}
