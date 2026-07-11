import { Glass, PageHeader } from "./Glass";

export function ComingSoonPage({
  title,
  subtitle,
  phase,
}: {
  title: string;
  subtitle: string;
  phase: string;
}) {
  return (
    <div>
      <PageHeader eyebrow="VMI FINANCE" title={title} subtitle={subtitle} />
      <Glass className="p-8 min-h-[200px] flex items-center">
        <p className="text-text-dim text-sm">Built out in {phase}, live against Supabase.</p>
      </Glass>
    </div>
  );
}
