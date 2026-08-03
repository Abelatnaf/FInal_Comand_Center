import { Amount } from "@/components/money/Amount";
import { formatRelativeDay } from "@/lib/date";

export type TransferRowData = {
  id: string;
  occurred_on: string;
  amount_minor: number;
  from_name: string;
  to_name: string;
  note: string | null;
};

/**
 * Read-only on purpose. A transfer isn't income or spending, so it is
 * deliberately excluded from bulk selection, the category summary, and the
 * net total -- it appears here only so the Ledger is an honest record of
 * everything that moved. Editing lives in Settings.
 */
export function TransferRow({ transfer }: { transfer: TransferRowData }) {
  return (
    <div className="row flex items-center justify-between gap-3">
      <div className="min-w-0 flex-1">
        <p className="text-[15px] text-muted truncate">
          {transfer.from_name} → {transfer.to_name}
        </p>
        <p className="text-[13px] text-faint">
          {formatRelativeDay(transfer.occurred_on)} · Transfer
          {transfer.note && ` · ${transfer.note}`}
        </p>
      </div>
      <Amount minor={BigInt(transfer.amount_minor)} className="text-muted shrink-0" />
    </div>
  );
}
