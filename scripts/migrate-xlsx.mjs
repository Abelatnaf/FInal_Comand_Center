#!/usr/bin/env node
/**
 * One-time importer for real historical data out of Expense_Tracker.xlsx.
 *
 * Scope: Transactions, Income, and Savings Goals only. Recurring Bills, Net
 * Worth, and Key Dates were already seeded with their real rows directly in
 * the Phase 2 migration (supabase/migrations/20260711090100_seed_reference_data.sql)
 * — running this script against those tabs would create duplicates, so it
 * intentionally does not touch them.
 *
 * Skips the literal "example row — delete or overwrite" placeholder rows,
 * per the build spec. As of the Phase 1/2 build the real workbook's
 * Transactions/Income tabs contain only that placeholder — this script is
 * here for whenever Abel actually has real historical rows to bring in.
 *
 * Usage:
 *   node scripts/migrate-xlsx.mjs path/to/Expense_Tracker.xlsx [--dry-run]
 *
 * Requires NEXT_PUBLIC_SUPABASE_URL / NEXT_PUBLIC_SUPABASE_ANON_KEY in the
 * environment (e.g. `node --env-file=.env.local scripts/migrate-xlsx.mjs ...`)
 * and signs in interactively with the real Supabase Auth account — RLS is
 * single-user/authenticated-only, so there is no anon write path, and this
 * intentionally avoids needing a service_role key.
 */

import { createClient } from "@supabase/supabase-js";
import xlsx from "xlsx";
import readline from "node:readline/promises";
import { stdin, stdout } from "node:process";

const PLACEHOLDER_RE = /example row.*delete or overwrite/i;

function excelDateToIso(value) {
  if (value instanceof Date) return value.toISOString().slice(0, 10);
  if (typeof value === "number") {
    const date = xlsx.SSF.parse_date_code(value);
    return `${date.y}-${String(date.m).padStart(2, "0")}-${String(date.d).padStart(2, "0")}`;
  }
  return String(value);
}

async function promptCredentials() {
  const rl = readline.createInterface({ input: stdin, output: stdout });
  const email = await rl.question("Supabase account email: ");
  const password = await rl.question("Password: ");
  rl.close();
  return { email, password };
}

async function main() {
  const args = process.argv.slice(2);
  const dryRun = args.includes("--dry-run");
  const filePath = args.find((a) => !a.startsWith("--"));

  if (!filePath) {
    console.error("Usage: node scripts/migrate-xlsx.mjs path/to/Expense_Tracker.xlsx [--dry-run]");
    process.exit(1);
  }

  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!url || !anonKey) {
    console.error("Missing NEXT_PUBLIC_SUPABASE_URL / NEXT_PUBLIC_SUPABASE_ANON_KEY in the environment.");
    console.error("Run with: node --env-file=.env.local scripts/migrate-xlsx.mjs ...");
    process.exit(1);
  }

  const supabase = createClient(url, anonKey);

  // RLS requires an authenticated session for reads too (categories included),
  // so --dry-run still signs in — it only skips the final insert calls below.
  if (dryRun) console.log("--dry-run: previewing only, no writes will be made.\n");
  const { email, password } = await promptCredentials();
  const { error: authError } = await supabase.auth.signInWithPassword({ email, password });
  if (authError) {
    console.error("Sign-in failed:", authError.message);
    process.exit(1);
  }

  const { data: categories } = await supabase.from("categories").select("id, name");
  const categoryIdByName = new Map((categories ?? []).map((c) => [c.name, c.id]));

  const workbook = xlsx.readFile(filePath);

  // ---- Transactions ----
  const txSheet = workbook.Sheets["Transactions"];
  const txRows = txSheet ? xlsx.utils.sheet_to_json(txSheet, { defval: null }) : [];
  const transactions = [];
  let txSkipped = 0;

  for (const row of txRows) {
    const notes = row["Notes"];
    if (!row["Date"] || (notes && PLACEHOLDER_RE.test(String(notes)))) {
      if (notes && PLACEHOLDER_RE.test(String(notes))) txSkipped++;
      continue;
    }
    const categoryId = categoryIdByName.get(row["Category"]);
    if (!categoryId) {
      console.warn(`Skipping transaction with unknown category "${row["Category"]}":`, row);
      continue;
    }
    transactions.push({
      date: excelDateToIso(row["Date"]),
      category_id: categoryId,
      description: row["Description"] ?? null,
      necessity: row["Necessary/\nDiscretionary"] ?? row["Necessary/Discretionary"] ?? null,
      is_recurring: String(row["Recurring?"]).toLowerCase() === "yes",
      currency: row["Currency"],
      amount_original: Number(row["Amount\n(Original)"] ?? row["Amount (Original)"]),
      payment_method: row["Payment Method"] ?? null,
      notes: notes ?? null,
    });
  }

  // ---- Income ----
  const incomeSheet = workbook.Sheets["Income"];
  const incomeRows = incomeSheet ? xlsx.utils.sheet_to_json(incomeSheet, { defval: null }) : [];
  const income = [];
  let incomeSkipped = 0;

  for (const row of incomeRows) {
    const notes = row["Notes"];
    if (!row["Date"] || (notes && PLACEHOLDER_RE.test(String(notes)))) {
      if (notes && PLACEHOLDER_RE.test(String(notes))) incomeSkipped++;
      continue;
    }
    income.push({
      date: excelDateToIso(row["Date"]),
      source: row["Source"] ?? null,
      currency: row["Currency"],
      amount_original: Number(row["Amount\n(Original)"] ?? row["Amount (Original)"]),
      notes: notes ?? null,
    });
  }

  // ---- Savings Goals ----
  const goalsSheet = workbook.Sheets["Savings Goals"];
  const goalsRows = goalsSheet ? xlsx.utils.sheet_to_json(goalsSheet, { defval: null }) : [];
  const goals = [];
  let goalsSkipped = 0;

  for (const row of goalsRows) {
    const name = row["Goal Name"];
    if (!name || /^example:/i.test(String(name))) {
      if (name) goalsSkipped++;
      continue;
    }
    goals.push({
      name,
      target_amount_usd: Number(row["Target Amount (USD)"]),
      target_date: row["Target Date"] ? excelDateToIso(row["Target Date"]) : null,
      saved_so_far_usd: Number(row["Saved So Far (USD)"] ?? 0),
    });
  }

  console.log(`Transactions: ${transactions.length} to import, ${txSkipped} placeholder row(s) skipped.`);
  console.log(`Income: ${income.length} to import, ${incomeSkipped} placeholder row(s) skipped.`);
  console.log(`Savings Goals: ${goals.length} to import, ${goalsSkipped} placeholder row(s) skipped.`);

  if (dryRun) {
    console.log("\nTransactions preview:", transactions);
    console.log("\nIncome preview:", income);
    console.log("\nSavings goals preview:", goals);
    console.log("\n--dry-run: no data was written.");
    return;
  }

  if (transactions.length) {
    const { error } = await supabase.from("transactions").insert(transactions);
    if (error) console.error("Transactions insert failed:", error.message);
    else console.log(`Inserted ${transactions.length} transaction(s).`);
  }

  if (income.length) {
    const { error } = await supabase.from("income").insert(income);
    if (error) console.error("Income insert failed:", error.message);
    else console.log(`Inserted ${income.length} income row(s).`);
  }

  if (goals.length) {
    const { error } = await supabase.from("savings_goals").insert(goals);
    if (error) console.error("Savings goals insert failed:", error.message);
    else console.log(`Inserted ${goals.length} savings goal(s).`);
  }
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
