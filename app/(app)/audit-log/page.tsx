import { PageHeader } from "@/components/glass/Glass";
import { AuditLogTable } from "@/components/tables/AuditLogTable";
import { createClient } from "@/lib/supabase/server";

export default async function AuditLogPage() {
  const supabase = await createClient();

  const { data: entries } = await supabase
    .from("audit_log")
    .select("id, table_name, record_id, action, old_data, new_data, changed_at")
    .order("changed_at", { ascending: false })
    .limit(300);

  return (
    <div>
      <PageHeader title="History" subtitle="A record of every change ever made, so nothing gets lost or forgotten." />
      <AuditLogTable entries={entries ?? []} />
    </div>
  );
}
