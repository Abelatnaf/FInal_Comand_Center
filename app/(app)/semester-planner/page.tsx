import { PageHeader } from "@/components/glass/Glass";
import { SemesterCard } from "@/components/glass/SemesterCard";
import { createClient } from "@/lib/supabase/server";

export default async function SemesterPlannerPage() {
  const supabase = await createClient();

  const { data: semesters } = await supabase.from("semester_pacing").select("*").order("start_date");

  const typedSemesters = (semesters ?? [])
    .filter((s) => s.id !== null)
    .map((s) => ({
      id: s.id!,
      name: s.name ?? "",
      start_date: s.start_date!,
      end_date: s.end_date!,
      total_days: s.total_days ?? 0,
      elapsed_days: s.elapsed_days ?? 0,
      elapsed_percent: s.elapsed_percent,
      actual_spend: s.actual_spend ?? 0,
      income: s.income ?? 0,
      budget: s.budget ?? 0,
      spend_percent: s.spend_percent,
      status: s.status ?? "Not Started",
    }));

  return (
    <div>
      <PageHeader
        eyebrow="VMI FINANCE"
        title="Semester Planner"
        subtitle="Fall 2026 / Spring 2027 budget pacing."
      />
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {typedSemesters.map((s) => (
          <SemesterCard key={s.id} semester={s} />
        ))}
      </div>
    </div>
  );
}
