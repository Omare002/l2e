import { supabase } from "@/integrations/supabase/client";

const REMEMBER_KEY = "l2e:remember-me";
const TAB_KEY = "l2e:tab-alive";

export function setRememberMe(remember: boolean) {
  try {
    localStorage.setItem(REMEMBER_KEY, remember ? "1" : "0");
    sessionStorage.setItem(TAB_KEY, "1");
  } catch {
    /* storage unavailable */
  }
}

/**
 * "Remember me" off means the session should not survive closing the browser.
 * A fresh browser session (no sessionStorage marker) ends the stored session.
 */
export async function enforceRememberMe() {
  try {
    const remember = localStorage.getItem(REMEMBER_KEY);
    const sameTabSession = sessionStorage.getItem(TAB_KEY);
    if (remember === "0" && !sameTabSession) {
      await supabase.auth.signOut();
      localStorage.removeItem(REMEMBER_KEY);
      return;
    }
    sessionStorage.setItem(TAB_KEY, "1");
  } catch {
    /* storage unavailable */
  }
}
