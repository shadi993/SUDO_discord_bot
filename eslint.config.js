import globals from "globals";
import pluginJs from "@eslint/js";


export default [
  {
    languageOptions: { globals: globals.node },
    files: ["src/**/*.js", "src/**/*.mjs"],
  },
  pluginJs.configs.recommended,
];