/**
 * Reader preferences kept on the device (localStorage). Nothing here is sent
 * to the server. Keys are shared by the inline scripts (which apply them
 * before first paint) and the client store in ./preferences.tsx.
 */
export const PREF_KEYS = {
  /** "large" | "normal" -> <html data-text="large"> */
  text: "hg:text",
  /** "high" | "normal"; unset follows the OS (prefers-contrast: more) -> <html data-contrast="high"> */
  contrast: "hg:contrast",
  /** locality slug, e.g. "sector-56"; unset = all of Gurugram */
  locality: "hg:locality",
  /** JSON array of recent search strings (max 6) */
  recent: "hg:recent",
} as const;

/** Runs in <head> before paint: applies text size and contrast to <html>. */
export const PREFS_HEAD_SCRIPT = `(function(){try{var d=document.documentElement,s=window.localStorage;if(s.getItem("${PREF_KEYS.text}")==="large")d.setAttribute("data-text","large");var c=s.getItem("${PREF_KEYS.contrast}");if(c==="high"||(c===null&&window.matchMedia&&window.matchMedia("(prefers-contrast: more)").matches))d.setAttribute("data-contrast","high")}catch(e){}})()`;

/**
 * Runs right after the locality label: shows the saved locality's name before
 * paint (the label is server-rendered as "Gurugram").
 */
export function localityLabelScript(elementId: string, names: Record<string, string>): string {
  const json = (value: unknown) => JSON.stringify(value).replace(/</g, "\\u003c");
  return `(function(){try{var s=window.localStorage.getItem("${PREF_KEYS.locality}");var m=${json(names)};var e=document.getElementById(${json(elementId)});if(s&&e&&m[s])e.textContent=m[s]}catch(x){}})()`;
}
