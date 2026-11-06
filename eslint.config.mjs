// Lint for the backend (Node). The frontend has its own config in frontend/eslint.config.js.
import js from "@eslint/js";
import globals from "globals";
import { defineConfig, globalIgnores } from "eslint/config";

export default defineConfig([
  globalIgnores(["frontend/**", "node_modules/**", "dev-config/**", "docker-config/**"]),
  {
    files: ["**/*.js", "bin/www"],
    extends: [js.configs.recommended],
    languageOptions: {
      ecmaVersion: "latest",
      sourceType: "commonjs",
      globals: globals.node,
    },
    rules: {
      // Unused callback params and caught errors are common here; flag unused variables only
      "no-unused-vars": ["warn", { args: "none", caughtErrors: "none" }],
      // Older code re-declares `var` names within a function; valid JS, so warn rather than fail
      "no-redeclare": "warn",
      "no-useless-assignment": "warn",
    },
  },
]);
