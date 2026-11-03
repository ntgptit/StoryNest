// Flat config. Besides the usual rules it enforces the package boundaries from docs/WBS.md section 1.3:
//   utils, database  -> no React, Next, Supabase client or other workspace packages
//   validation       -> only zod + database types (no React/Next/Supabase client, no ui/features)
//   ui               -> no Next, Supabase, features, database or validation (pure presentation)
//   features         -> no Next (shared by web SSR and the Capacitor/Vite shell)
//   everything       -> no deep imports into another workspace package's src/
import js from "@eslint/js";
import globals from "globals";
import reactHooks from "eslint-plugin-react-hooks";
import tseslint from "typescript-eslint";

const NEXT = ["next", "next/*"];
const SUPABASE = ["@supabase/*"];
const REACT = ["react", "react-dom", "react/*", "react-dom/*"];
const DEEP = {
  group: ["@storynest/*/src", "@storynest/*/src/*"],
  message: "Import the package entry point, not its internals.",
};

/** Build a no-restricted-imports rule block for the given file globs. */
function boundary(files, ban, message) {
  return {
    files,
    rules: {
      "no-restricted-imports": ["error", { patterns: [{ group: ban, message }, DEEP] }],
    },
  };
}

export default tseslint.config(
  {
    ignores: [
      "**/node_modules/**",
      "**/.next/**",
      "**/dist/**",
      "**/out/**",
      "**/next-env.d.ts",
      "packages/database/src/database.types.ts",
      "supabase/**",
      "android/**",
      "ios/**",
    ],
  },
  js.configs.recommended,
  ...tseslint.configs.recommended,
  {
    languageOptions: { globals: { ...globals.browser, ...globals.node } },
    rules: {
      "@typescript-eslint/no-unused-vars": ["error", { argsIgnorePattern: "^_", varsIgnorePattern: "^_" }],
      "@typescript-eslint/no-explicit-any": "error",
    },
  },
  {
    files: ["**/*.tsx", "**/*.ts"],
    plugins: { "react-hooks": reactHooks },
    rules: {
      "react-hooks/rules-of-hooks": "error",
      "react-hooks/exhaustive-deps": "warn",
    },
  },

  boundary(
    ["packages/utils/**/*.{ts,tsx}", "packages/database/**/*.{ts,tsx}"],
    ["@storynest/*", ...REACT, ...NEXT, ...SUPABASE],
    "This package must stay dependency-free (no React, Next, Supabase client or workspace packages).",
  ),
  boundary(
    ["packages/validation/**/*.{ts,tsx}"],
    ["@storynest/ui", "@storynest/features", "@storynest/design-tokens", ...REACT, ...NEXT, ...SUPABASE],
    "validation may depend only on zod and @storynest/database types.",
  ),
  boundary(
    ["packages/ui/**/*.{ts,tsx}"],
    ["@storynest/features", "@storynest/database", "@storynest/validation", ...NEXT, ...SUPABASE],
    "ui is presentation only: no data access, validation or Next-specific imports.",
  ),
  boundary(
    ["packages/features/**/*.{ts,tsx}"],
    [...NEXT],
    "features are shared with the Vite/Capacitor shell: use the PlatformProvider adapter instead of next/*.",
  ),
  {
    files: ["apps/**/*.{ts,tsx}"],
    rules: { "no-restricted-imports": ["error", { patterns: [DEEP] }] },
  },
);
