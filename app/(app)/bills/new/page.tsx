import { ObligationForm } from "@/components/bills/ObligationForm";

export default function NewBillPage() {
  return (
    <div className="flex flex-col gap-6">
      <h1 className="page-title">Add a bill</h1>
      <ObligationForm mode="new" />
    </div>
  );
}
