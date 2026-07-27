import { z } from "zod";

// Shared between the /add client form's pre-check and its server action --
// one source of truth per shape (plan section 8).
export const transactionSchema = z.object({
  amount_minor: z.coerce.bigint().positive({ message: "Enter an amount." }),
  currency: z.enum(["ETB", "USD"]),
  direction: z.enum(["in", "out"]),
  category: z.string().max(60).optional(),
  occurred_on: z.string().min(1, "Pick a date."),
  account_id: z.string().uuid("Pick an account."),
  payer_id: z.string().uuid("Pick who this is for."),
  note: z.string().max(500).optional(),
  obligation_id: z.string().uuid().optional(),
});

export type TransactionInput = z.infer<typeof transactionSchema>;
