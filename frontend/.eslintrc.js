module.exports = {
    "env": {
        "browser": true,
        "es2021": true
    },
    "extends": [
        "eslint:recommended",
        "plugin:react/recommended",
        "plugin:@typescript-eslint/eslint-recommended",
        "plugin:@typescript-eslint/recommended",
    ],
    "overrides": [],
    "parser": "@typescript-eslint/parser",
    "parserOptions": {
        "ecmaVersion": "latest",
        "sourceType": "module"
    },
    "plugins": [
        "react",
        "@typescript-eslint",
    ],
    // Ignore dot '.' files in project folder
    "ignorePatterns": ["\.*"],
    "rules": {
        "react/prop-types": "off",
        "no-mixed-spaces-and-tabs": "off",
        "@typescript-eslint/no-explicit-any": "off",
    },
}
