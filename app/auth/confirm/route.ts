import { type EmailOtpType } from "@supabase/supabase-js";
import { type NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

// Where the links in Supabase's confirmation and password-reset emails land.
// Exchanging the token here (rather than on a page) means the session cookie
// is set before any page renders, so the destination never flashes a
// signed-out state first.
export async function GET(request: NextRequest) {
  const { searchParams } = request.nextUrl;
  const token_hash = searchParams.get("token_hash");
  const type = searchParams.get("type") as EmailOtpType | null;
  const next = searchParams.get("next") ?? "/";

  // Only ever redirect to a path on this site. Taking the raw parameter would
  // turn every confirmation email into an open redirect.
  const safeNext = next.startsWith("/") && !next.startsWith("//") ? next : "/";

  if (token_hash && type) {
    const supabase = await createClient();
    const { error } = await supabase.auth.verifyOtp({ type, token_hash });
    if (!error) {
      return NextResponse.redirect(new URL(safeNext, request.url));
    }
  }

  return NextResponse.redirect(new URL("/login?error=link_expired", request.url));
}
