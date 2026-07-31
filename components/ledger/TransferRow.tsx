import { Amount } from "@/components/money/Amount";
import { formatRelativeDay } from "@/lib/date";
import type { Currency } from "@/lib/money";

export type TransferRowData = {
  id: string;
  occurred_on: string;
  from_amount_minor: number;
  to_amount_minor: number;
  from_name: string;
  to_name: string;
  from_currency: Currency;
  to_currency: Currency;
  note: string | null;
};

/**
 * Read-only on purpose. A transfer isn't income or spending, so it is
 * deliberately excluded from bulk selection, the category summary, and the
 * net-per-currency total -- it appears here only so the Ledger is an honest
 * record of everything that moved. Editing lives in Settings.
 */
export function TransferRow({ transfer }: { transfer: TransferRowData }) {
  const crossCurrency = transfer.from_currency !== transfer.to_currency;

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
      <div className="text-right shrink-0">
        <Amount
          minor={BigInt(transfer.from_amount_minor)}
          currency={transfer.from_currency}
          className="text-muted block"
        />
        {crossCurrency && (
          <Amount
            minor={BigInt(transfer.to_amount_minor)}
            currency={transfer.to_currency}
            className="text-faint text-[13px] block"
          />
        )}
      </div>
    </div>
  );
}
