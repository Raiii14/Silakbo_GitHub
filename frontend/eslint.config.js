import js from '@eslint/js';

export default [
  js.configs.recommended,
  {
    files: ["src/**/*.{js,jsx,ts,tsx}"],
    rules: {
      "no-unused-vars": "warn",
      "no-undef": "off" // Using TypeScript and Vite mostly
    }
  }
];
