module.exports = {
  extends: ['@allbin/eslint-config'],
  rules: {
    '@typescript-eslint/no-unsafe-assignment': 'off',
    '@typescript-eslint/no-unsafe-member-access': 'off',
    '@typescript-eslint/restrict-plus-operands': 'off',
  },
  parserOptions: {
    sourceType: 'module',
  },
  ignorePatterns: ['.eslintrc.js'],
};
