import { PageHeader } from "@/components/glass/Glass";
import { AssistantChat } from "@/components/AssistantChat";

export default function AssistantPage() {
  return (
    <div>
      <PageHeader title="Assistant" subtitle="Ask questions about your spending, budgets, and accounts." />
      <AssistantChat />
    </div>
  );
}
