import js from "@eslint/js";
import globals from "globals";

export default [
  { ignores: ["node_modules/**", "shared/**", "vendor/**"] },
  js.configs.recommended,
  {
    languageOptions: { ecmaVersion: "latest", sourceType: "module" },
  },
  {
    files: ["src/**/*.js", "scripts/**/*.js"],
    languageOptions: { globals: globals.node },
  },
  {
    files: ["test/**/*.js"],
    languageOptions: { globals: globals.node },
  },
  {
    files: ["eslint.config.js"],
    languageOptions: { globals: globals.node },
  },
];
