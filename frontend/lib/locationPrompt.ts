/** Session flag: show soft location prompt once after login/register. */

const KEY = "agrosphere_ask_location";

export function markAskLocationAfterAuth(): void {
  if (typeof window === "undefined") return;
  sessionStorage.setItem(KEY, "1");
}

export function shouldAskLocationAfterAuth(): boolean {
  if (typeof window === "undefined") return false;
  return sessionStorage.getItem(KEY) === "1";
}

export function clearAskLocationAfterAuth(): void {
  if (typeof window === "undefined") return;
  sessionStorage.removeItem(KEY);
}
