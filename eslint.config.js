import globals from "globals";
import pluginJs from "@eslint/js";
import tseslint from "typescript-eslint";


export default [
  {files: ["src/**/*.{js,mjs,cjs,ts}"]},
  {files: ["src/**/*.js"], languageOptions: {sourceType: "commonjs"}},
  {ignores: ["dist/*"]},
  eslint.configs.recommended,
  ...tseslint.configs.recommended,
];