import globals from "globals";
import pluginJs from "@eslint/js";


export default [
  { ignores: ["src/dashboard/dist/**"] },
  pluginJs.configs.recommended,
  {
    languageOptions: { globals: globals.node },
    files: ["src/**/*.js", "src/**/*.mjs"],
  },
  {
    files: ["src/dashboard/client/**/*.js", "src/dashboard/client/**/*.jsx"],
    languageOptions: {
      globals: globals.browser,
      parserOptions: { ecmaFeatures: { jsx: true } },
    },
    rules: { "no-unused-vars": "off" },
  },
];