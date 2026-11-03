// Outside Next there is no cache: tags and lifetimes are recorded and ignored.
export function cacheTag(...tags) {
  globalThis.__smokeTags = [...(globalThis.__smokeTags ?? []), ...tags];
}
export function cacheLife() {}
export function updateTag(tag) {
  (globalThis.__smokeExpired ??= []).push(tag);
}
export function revalidateTag(tag) {
  (globalThis.__smokeExpired ??= []).push(tag);
}
export function refresh() {}
