// Lets `npm run test:data` import the server-only data layer outside Next: next/* and
// server-only resolve to small stubs (cookies are an in-memory jar, redirect()/notFound() throw).
import { registerHooks } from "node:module";

const dir = new URL("./stubs/", import.meta.url);
const map = {
  "server-only": "empty.mjs",
  "next/cache": "next-cache.mjs",
  "next/server": "next-server.mjs",
  "next/headers": "next-headers.mjs",
  "next/navigation": "next-navigation.mjs",
};

registerHooks({
  resolve(specifier, context, next) {
    if (map[specifier]) return { url: new URL(map[specifier], dir).href, shortCircuit: true, format: "module" };
    return next(specifier, context);
  },
});
