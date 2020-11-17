// Currently we're only using eslint to detect missing dependencies via
// https://github.com/benmosher/eslint-plugin-import

module.exports = {
    "env": {
        "browser": true,
        "commonjs": true,
        "es6": true,
        "node": true,
    },
    "plugins": ["eslint-plugin-import"],

    // "extends": "eslint:recommended",

    "globals": {
        "Atomics": "readonly",
        "SharedArrayBuffer": "readonly"
    },
    "parserOptions": {
        "ecmaVersion": 2018,
    },
    "rules": {
        "import/no-unresolved": [
            "error",
            {
                commonjs: true
            },
        ],
    },
};
