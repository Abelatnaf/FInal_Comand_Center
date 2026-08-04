import { createClient } from "@/lib/supabase/server";
import { LoansManager, type LoanRow, type LoanSummary } from "@/components/loans/LoansManager";

export const metadata = { title: "Student loans" };

export default async function LoansPage() {
  const supabase = await createClient();

  const [loansRes, summaryRes, termsRes] = await Promise.all([
    supabase
      .from("student_loans")
      .select("id, name, servicer, principal_minor, interest_rate_bp, is_subsidized, disbursed_on, terms(name)")
      .order("disbursed_on", { ascending: false }),
    supabase.from("student_loan_summary").select("*").maybeSingle(),
    supabase
      .from("terms")
      .select("id, name")
      .eq("is_archived", false)
      .order("starts_on", { ascending: false }),
  ]);

  const loans: LoanRow[] = (loansRes.data ?? []).map((l) => ({
    id: l.id,
    name: l.name,
    servicer: l.servicer,
    principal_minor: l.principal_minor,
    interest_rate_bp: l.interest_rate_bp,
    is_subsidized: l.is_subsidized,
    disbursed_on: l.disbursed_on,
    term_name: (l.terms as { name: string } | null)?.name ?? null,
  }));

  const s = summaryRes.data;
  const summary: LoanSummary = s
    ? {
        principal_minor: s.principal_minor ?? 0,
        accrued_interest_minor: s.accrued_interest_minor ?? 0,
        balance_minor: s.balance_minor ?? 0,
        avg_rate_percent: s.avg_rate_percent,
        est_monthly_payment_minor: s.est_monthly_payment_minor,
      }
    : null;

  return (
    <div className="flex flex-col gap-5">
      <div>
        <h1 className="page-title">Student loans</h1>
        <p className="text-[14px] text-muted mt-0.5">What you&rsquo;ve borrowed, and what it&rsquo;ll cost</p>
      </div>
      <LoansManager loans={loans} summary={summary} terms={termsRes.data ?? []} />
    </div>
  );
}
