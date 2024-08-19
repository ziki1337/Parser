module.exports = [
    {
      ignores: ["node_modules"],
    },
    {
      files: ["**/*.js"],
      languageOptions: {
        ecmaVersion: 2020,
        sourceType: "module",
      },
      rules: {
        "semi": ["error", "always"],
        "quotes": ["error", "single"],
      },
    },
];