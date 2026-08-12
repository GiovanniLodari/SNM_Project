import js from "@eslint/js";
import globals from "globals";
import reactHooks from "eslint-plugin-react-hooks";
import reactRefresh from "eslint-plugin-react-refresh";
import tseslint from "typescript-eslint";

/**
 * Configurazione ESLint (flat config).
 *
 * Prima non esisteva alcun linter, eppure il codice conteneva direttive
 * `eslint-disable`: silenziavano regole che nessuno stava applicando. Le regole
 * qui sotto sono quelle che avrebbero intercettato problemi realmente presenti:
 * `react-hooks/exhaustive-deps` per le closure stantie negli effect,
 * `no-unused-vars` per import e componenti rimasti orfani.
 *
 * Le opzioni di tipo (strict, noUnusedLocals, noUnusedParameters) restano nel
 * tsconfig: qui non si duplicano, si aggiunge cio' che il compilatore non vede.
 */
export default tseslint.config(
  { ignores: ["dist", "node_modules", "src/api/schema.d.ts"] },
  {
    extends: [js.configs.recommended, ...tseslint.configs.recommended],
    files: ["**/*.{ts,tsx}"],
    languageOptions: {
      ecmaVersion: 2020,
      globals: globals.browser,
    },
    plugins: {
      "react-hooks": reactHooks,
      "react-refresh": reactRefresh,
    },
    rules: {
      ...reactHooks.configs.recommended.rules,
      "react-refresh/only-export-components": ["warn", { allowConstantExport: true }],

      // Il tsconfig ha gia' noUnusedLocals/noUnusedParameters, ma non copre gli
      // argomenti scartati di proposito: qui si concede il prefisso _.
      "@typescript-eslint/no-unused-vars": [
        "error",
        { argsIgnorePattern: "^_", varsIgnorePattern: "^_" },
      ],

      // `any` va evitato ma non blocca: alcuni punti di frontiera (formatter di
      // Recharts, payload non tipizzati) lo usano ancora. Segnalarli come
      // warning li rende visibili senza fermare il lavoro.
      "@typescript-eslint/no-explicit-any": "warn",

      // console.error e console.warn restano leciti per la diagnostica;
      // console.log no, non deve finire in produzione.
      "no-console": ["warn", { allow: ["error", "warn"] }],
    },
  },
);
