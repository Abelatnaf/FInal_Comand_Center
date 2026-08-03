import Link from "next/link";

export const metadata = { title: "Privacy Policy — Command Deck" };

export default function PrivacyPage() {
  return (
    <div className="min-h-screen px-5 py-12">
      <div className="max-w-2xl mx-auto">
        <Link href="/login" className="text-muted text-[14px]">
          ← Back
        </Link>

        <h1 className="text-[28px] font-semibold text-text mt-4 mb-1">Privacy Policy</h1>
        <p className="text-[13px] text-faint mb-8">Last updated August 3, 2026</p>

        <div className="card row mb-8">
          <p className="text-[14px] text-muted">
            Command Deck is a small, independent expense tracker. This page describes what actually happens to
            your data in plain language — it has not been drafted or reviewed by a lawyer.
          </p>
        </div>

        <div className="flex flex-col gap-6 text-[15px] text-muted">
          <section>
            <h2 className="text-[17px] font-medium text-text mb-2">What we collect</h2>
            <p>
              An email address and password (used only to sign you in), and whatever financial data you choose to
              enter or import: transactions, accounts, budgets, bills and goals. Nothing else is collected. There is
              no analytics or tracking of any kind.
            </p>
          </section>

          <section>
            <h2 className="text-[17px] font-medium text-text mb-2">How your password is handled</h2>
            <p>
              Authentication is handled by Supabase Auth. Your password is hashed before storage — nobody with
              database access can read it back out.
            </p>
          </section>

          <section>
            <h2 className="text-[17px] font-medium text-text mb-2">Where your data lives</h2>
            <p>
              All data is stored in a Postgres database hosted by Supabase, with the app itself hosted on Vercel.
              Every row is scoped to your account with row-level security.
            </p>
          </section>

          <section>
            <h2 className="text-[17px] font-medium text-text mb-2">What we don&apos;t do</h2>
            <p>
              We don&apos;t sell your data or share it with advertisers. We don&apos;t connect to your bank — entries
              are typed in or imported from a CSV file you choose, and no credentials for any bank are ever asked
              for or stored. We don&apos;t use your financial data to train any model.
            </p>
          </section>

          <section>
            <h2 className="text-[17px] font-medium text-text mb-2">Cookies</h2>
            <p>
              The only cookies this app sets are the ones Supabase Auth uses to keep you signed in. No advertising or
              analytics tracking.
            </p>
          </section>

          <section>
            <h2 className="text-[17px] font-medium text-text mb-2">Your data, your control</h2>
            <p>
              You can export everything as a single JSON file at any time from Settings, and delete your account and
              every record attached to it from the same screen. Deletion is immediate and permanent, so take an
              export first if you want a copy.
            </p>
          </section>
        </div>
      </div>
    </div>
  );
}
