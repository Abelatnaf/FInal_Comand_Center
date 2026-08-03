"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import {
  createRecurringExpense,
  deleteRecurringExpense,
  postRecurringNow,
  setRecurringActive,
  setRecurringAutoPost,
} from "@/app/(app)/recurring/actions";
import { Amount } from "@/components/money/Amount";
import { colorVar, type Category } from "@/lib/categories";
import { formatShortDate, todayIso } from "@/lib/date";
import type { Currency } from "@/lib/money";

export type RecurringItem = {
  id: string;
  name: string;
  amount_minor: number;
  cadence: string;
  next_due_on: string;
  auto_post: boolean;
  is_active: boolean;
  last_posted_on: string | null;
  account_id: string;
  account_name: string;
  currency: Currency;
  category_id: string | null;
  category_name: string | null;
  category_icon: string | null;
  category_color: string | null;
};

type Account = { id: string; name: string; currency: Currency };
type Payer = { id: string; label: string; is_default: boolean };

const CADENCE_LABEL: Record<string, string> = {
  weekly: "Weekly",
  monthly: "Monthly",
  quarterly: "Every 3 months",
  yearly: "Yearly",
};

export function RecurringManager({
  items,
  accounts,
  payers,
  categories,
}: {
  items: RecurringItem[];
  accounts: Account[];
  payers: Payer[];
  categories: Category[];
}) {
  const [adding, setAdding] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const router = useRouter();

  const expenseCategories = categories.filter((c) => c.kind === "expense" && !c.is_archived);

  async function run(fn: () => Promise<{ error?: string }>) {
    setBusy(true);
    setError(null);
    const res = await fn();
    setBusy(false);
    if (res.error) {
      setError(res.error);
      return;
    }
    router.refresh();
  }

  async function handleCreate(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const form = e.currentTarget;
    const formData = new FormData(form);
    setBusy(true);
    setError(null);
    const res = await createRecurringExpense(formData);
    setBusy(false);
    if (res.error) {
      setError(res.error);
      return;
    }
    form.reset();
    setAdding(false);
    router.refresh();
  }

  const active = items.filter((i) => i.is_active);
  const paused = items.filter((i) => !i.is_active);

  return (
    <div className="flex flex-col gap-5">
      {error && <p className="text-alarm text-[14px]">{error}</p>}

      {!adding ? (
        <button type="button" className="btn btn-primary" onClick={() => setAdding(true)}>
          Add a recurring expense
        </button>
      ) : (
        <form onSubmit={handleCreate} className="card">
          <div className="row">
            <label className="section-label block mb-1.5" htmlFor="r-name">
              Name
            </label>
            <input id="r-name" name="name" className="input" placeholder="Netflix" required />
          </div>
          <div className="row">
            <label className="section-label block mb-1.5" htmlFor="r-amount">
              Amount
            </label>
            <input id="r-amount" name="amount" className="input num" inputMode="decimal" placeholder="15.99" required />
            <p className="text-[12px] text-faint mt-1.5">
              In the currency of the account you pick — that&rsquo;s the currency the charge happens in.
            </p>
          </div>
          <div className="row">
            <label className="section-label block mb-1.5" htmlFor="r-cadence">
              Repeats
            </label>
            <select id="r-cadence" name="cadence" className="input" defaultValue="monthly">
              <option value="weekly">Weekly</option>
              <option value="monthly">Monthly</option>
              <option value="quarterly">Every 3 months</option>
              <option value="yearly">Yearly</option>
            </select>
          </div>
          <div className="row">
            <label className="section-label block mb-1.5" htmlFor="r-next">
              Next due
            </label>
            <input id="r-next" name="next_due_on" type="date" className="input" defaultValue={todayIso()} required />
          </div>
          <div className="row">
            <label className="section-label block mb-1.5" htmlFor="r-account">
              Account
            </label>
            <select id="r-account" name="account_id" className="input" required>
              {accounts.map((a) => (
                <option key={a.id} value={a.id}>
                  {a.name} ({a.currency})
                </option>
              ))}
            </select>
          </div>
          <div className="row">
            <label className="section-label block mb-1.5" htmlFor="r-category">
              Category
            </label>
            <select id="r-category" name="category_id" className="input">
              <option value="">None</option>
              {expenseCategories.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.icon} {c.name}
                </option>
              ))}
            </select>
          </div>
          <div className="row">
            <label className="section-label block mb-1.5" htmlFor="r-payer">
              Who&rsquo;s this for
            </label>
            <select
              id="r-payer"
              name="payer_id"
              className="input"
              defaultValue={payers.find((p) => p.is_default)?.id ?? payers[0]?.id}
              required
            >
              {payers.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.label}
                </option>
              ))}
            </select>
          </div>
          <div className="row">
            <label className="flex items-center gap-2.5 text-[15px]">
              <input type="checkbox" name="auto_post" defaultChecked className="w-[18px] h-[18px] accent-[var(--accent)]" />
              Log it automatically when it&rsquo;s due
            </label>
            <p className="text-[12px] text-faint mt-1.5">
              Off means it&rsquo;s only counted in your monthly total here — nothing is written to the ledger
              until you tap Log now.
            </p>
          </div>
          <div className="row flex gap-2">
            <button type="button" className="btn flex-1" onClick={() => setAdding(false)}>
              Cancel
            </button>
            <button type="submit" className="btn btn-primary flex-1" disabled={busy}>
              {busy ? "Saving…" : "Save"}
            </button>
          </div>
        </form>
      )}

      {items.length === 0 && (
        <div className="card row">
          <p className="text-[14px] text-muted">
            Nothing recurring yet. Add your subscriptions and standing bills to see what they cost you every
            month.
          </p>
        </div>
      )}

      {active.length > 0 && (
        <div className="card">
          <p className="section-label row pb-0">Active</p>
          {active.map((item) => (
            <Item key={item.id} item={item} busy={busy} run={run} />
          ))}
        </div>
      )}

      {paused.length > 0 && (
        <div className="card">
          <p className="section-label row pb-0">Paused</p>
          {paused.map((item) => (
            <Item key={item.id} item={item} busy={busy} run={run} />
          ))}
        </div>
      )}
    </div>
  );
}

function Item({
  item,
  busy,
  run,
}: {
  item: RecurringItem;
  busy: boolean;
  run: (fn: () => Promise<{ error?: string }>) => Promise<void>;
}) {
  const [open, setOpen] = useState(false);
  const overdue = item.is_active && item.next_due_on <= todayIso();

  return (
    <div className="row">
      <button type="button" className="w-full text-left flex items-center gap-3" onClick={() => setOpen((v) => !v)}>
        <div className="cat-icon" style={{ ["--cat-color" as string]: colorVar(item.category_color) }} aria-hidden>
          {item.category_icon ?? "🔁"}
        </div>
        <div className="min-w-0 flex-1">
          <p className="text-[15px] font-medium truncate">{item.name}</p>
          <p className={`text-[13px] ${overdue ? "text-urgent" : "text-muted"}`}>
            {CADENCE_LABEL[item.cadence] ?? item.cadence} · {overdue ? "due now" : `next ${formatShortDate(item.next_due_on)}`}
            {!item.auto_post && " · manual"}
          </p>
        </div>
        <Amount minor={BigInt(item.amount_minor)} currency={item.currency} className="shrink-0 font-semibold" />
      </button>

      {open && (
        <div className="flex flex-col gap-2 mt-3 pt-3 border-t">
          <p className="text-[13px] text-muted">
            {item.account_name}
            {item.category_name && ` · ${item.category_name}`}
            {item.last_posted_on && ` · last logged ${formatShortDate(item.last_posted_on)}`}
          </p>
          <div className="flex flex-wrap gap-2">
            <button
              type="button"
              className="btn text-[14px]"
              disabled={busy}
              onClick={() => run(() => postRecurringNow(item.id))}
            >
              Log now
            </button>
            <button
              type="button"
              className="btn text-[14px]"
              disabled={busy}
              onClick={() => run(() => setRecurringAutoPost(item.id, !item.auto_post))}
            >
              {item.auto_post ? "Stop auto-logging" : "Auto-log it"}
            </button>
            <button
              type="button"
              className="btn text-[14px]"
              disabled={busy}
              onClick={() => run(() => setRecurringActive(item.id, !item.is_active))}
            >
              {item.is_active ? "Pause" : "Resume"}
            </button>
            <button
              type="button"
              className="btn btn-destructive text-[14px]"
              disabled={busy}
              onClick={() => run(() => deleteRecurringExpense(item.id))}
            >
              Delete
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
