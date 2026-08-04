import { z } from "zod";

// Shared between the /add client form's pre-check and its server action --
// one source of truth per shape.
export const transactionSchema = z.object({
  amount_minor: z.coerce.bigint().positive({ message: "Enter an amount." }),
  direction: z.enum(["in", "out"]),
  category_id: z.string().uuid().optional(),
  occurred_on: z.string().min(1, "Pick a date."),
  account_id: z.string().uuid("Pick an account."),
  note: z.string().max(500).optional(),
  obligation_id: z.string().uuid().optional(),
  tags: z.array(z.string().min(1).max(40)).max(10).optional(),
});

export type TransactionInput = z.infer<typeof transactionSchema>;

/** Tags arrive from a form as one comma-separated string. */
export function parseTags(raw: string | undefined): string[] {
  if (!raw) return [];
  const seen = new Set<string>();
  for (const part of raw.split(",")) {
    const tag = part.trim().replace(/^#/, "").slice(0, 40);
    if (tag) seen.add(tag.toLowerCase());
  }
  return [...seen].slice(0, 10);
}
