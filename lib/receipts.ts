import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/lib/supabase/database.types";

export const RECEIPT_BUCKET = "receipts";

/** 8MB. Phone photos are usually well under this; a cap keeps a stray video out. */
export const MAX_RECEIPT_BYTES = 8 * 1024 * 1024;

const ALLOWED = ["image/jpeg", "image/png", "image/webp", "image/heic", "application/pdf"];

/**
 * Uploads a receipt and records the path on the transaction.
 *
 * The path MUST start with the user's id: the bucket's storage policies check
 * `storage.foldername(name)[1] = auth.uid()`, so any other shape is rejected
 * by the database rather than silently landing somewhere unreadable.
 *
 * Returns an error string, or null on success.
 */
export async function uploadReceipt(
  supabase: SupabaseClient<Database>,
  userId: string,
  transactionId: string,
  file: File
): Promise<string | null> {
  if (file.size > MAX_RECEIPT_BYTES) {
    return "That file is over 8MB. Try a smaller photo.";
  }
  if (file.type && !ALLOWED.includes(file.type)) {
    return "Receipts can be an image or a PDF.";
  }

  // Keep the real extension so the file opens correctly later, but don't reuse
  // the user's filename -- it can contain characters the storage path rejects.
  const ext = file.name.includes(".") ? file.name.split(".").pop()!.toLowerCase().slice(0, 5) : "bin";
  const path = `${userId}/${transactionId}/receipt.${ext}`;

  const { error: uploadError } = await supabase.storage
    .from(RECEIPT_BUCKET)
    .upload(path, file, { upsert: true, contentType: file.type || undefined });

  if (uploadError) return uploadError.message;

  const { error: updateError } = await supabase
    .from("transactions")
    .update({ receipt_path: path })
    .eq("id", transactionId);

  if (updateError) return updateError.message;
  return null;
}
