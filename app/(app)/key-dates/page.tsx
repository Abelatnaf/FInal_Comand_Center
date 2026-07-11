import { PageHeader } from "@/components/glass/Glass";
import { KeyDatesTable } from "@/components/tables/KeyDatesTable";
import { createClient } from "@/lib/supabase/server";

export default async function KeyDatesPage() {
  const supabase = await createClient();

  const { data: keyDates } = await supabase.from("key_dates").select("*").order("sort_order");

  return (
    <div>
      <PageHeader
        eyebrow="VMI FINANCE"
        title="Key Dates"
        subtitle="Leave / furlough calendar with budget notes."
      />
      <KeyDatesTable keyDates={keyDates ?? []} />
    </div>
  );
}
