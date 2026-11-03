import { defineConfig, globalIgnores } from "eslint/config";
import nextVitals from "eslint-config-next/core-web-vitals";
import nextTs from "eslint-config-next/typescript";

const ROUTES_MESSAGE =
  "Build internal URLs with the typed builders in @/lib/routes (e.g. routes.doctor(lang, slug)) so English/Hindi prefixes stay right.";

const eslintConfig = defineConfig([
  ...nextVitals,
  ...nextTs,
  {
    // Pages and components (feature work). The core layer (src/lib, src/app/actions) is left alone.
    files: ["src/app/**/*.{ts,tsx}", "src/components/**/*.{ts,tsx}"],
    ignores: ["src/app/actions/**"],
    rules: {
      // No hand-written internal paths: href="/gurgaon/…", href={`/gurgaon/${x}`}, redirect("/…").
      "no-restricted-syntax": [
        "error",
        {
          selector: "JSXAttribute[name.name='href'] > Literal[value=/^\\/(?!\\/)/]",
          message: ROUTES_MESSAGE,
        },
        {
          selector: "JSXAttribute[name.name='href'] > JSXExpressionContainer > Literal[value=/^\\/(?!\\/)/]",
          message: ROUTES_MESSAGE,
        },
        {
          selector: "JSXAttribute[name.name='href'] > JSXExpressionContainer > TemplateLiteral > TemplateElement:first-child[value.raw=/^\\/(?!\\/)/]",
          message: ROUTES_MESSAGE,
        },
        {
          selector: "CallExpression[callee.name=/^(redirect|permanentRedirect)$/] > Literal:first-child[value=/^\\//]",
          message: ROUTES_MESSAGE,
        },
      ],
    },
  },
  // Override default ignores of eslint-config-next.
  globalIgnores([
    // Default ignores of eslint-config-next:
    ".next/**",
    "out/**",
    "build/**",
    "next-env.d.ts",
  ]),
]);

export default eslintConfig;
