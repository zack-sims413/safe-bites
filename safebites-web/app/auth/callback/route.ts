import { createClient } from "../../../utils/supabase/server"; // Use your working import path
import { NextResponse } from "next/server";

export async function GET(request: Request) {
  const { searchParams, origin } = new URL(request.url);
  const code = searchParams.get("code");
  const next = searchParams.get("next") ?? "/";

  if (code) {
    const supabase = await createClient(); 
    
    // Exchange the code for a session
    const { error } = await supabase.auth.exchangeCodeForSession(code);
    
    if (!error) {
      // --- UPDATED REDIRECT LOGIC ---
      // This ensures we redirect to the correct domain in production (e.g. wisebites.app)
      const forwardedHost = request.headers.get("x-forwarded-host"); 
      const isLocalEnv = process.env.NODE_ENV === "development";

      if (isLocalEnv) {
        // Localhost: standard redirect
        return NextResponse.redirect(`${origin}${next}`);
      } else if (forwardedHost) {
        // Production: use the forwarded host (actual domain)
        return NextResponse.redirect(`https://${forwardedHost}${next}`);
      } else {
        // Fallback
        return NextResponse.redirect(`${origin}${next}`);
      }
    }
  }

  return NextResponse.redirect(`${origin}/auth/auth-code-error`);
}