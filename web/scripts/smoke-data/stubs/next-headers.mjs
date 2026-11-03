// An in-memory cookie jar shared by the whole run, so sign-in and sign-out work.
const jar = (globalThis.__smokeJar ??= new Map());

export async function cookies() {
  return {
    get: (name) => (jar.has(name) ? { name, value: jar.get(name) } : undefined),
    set: (name, value) => jar.set(name, value),
    delete: (name) => jar.delete(name),
  };
}

export async function headers() {
  return new Headers({ "x-forwarded-for": "203.0.113.9", "user-agent": "smoke-data" });
}
