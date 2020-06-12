module.exports = {
	env: {
    browser: true,
    es6: true
  },
  extends: [
    'prettier',
    'plugin:prettier/recommended',
  ],
  parser: '@typescript-eslint/parser',
  parserOptions: {
    ecmaVersion: 205
  },
  plugins: ['prettier'],
  rules: {
    'prettier/prettier': [
      'error',
      {
        singleQuote: true,
        semi: true,
        endOfLine: 'auto',
        tabWidth: 2,
      },
    ],
  },
};
