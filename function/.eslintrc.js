module.exports = {
  settings: {
    "import/resolver": {
      node: {
        extensions: [".js"],
        paths: ["./"],
      },
    },
  },
  extends: ["airbnb-base", "prettier", "plugin:prettier/recommended"],
  globals: {
    Atomics: "readonly",
    SharedArrayBuffer: "readonly",
  },
  plugins: ["prettier"],
  rules: {
    "prettier/prettier": "error",
    "react/forbid-prop-types": 0,
    "func-names": 0,
    "import/order": "error",
    "import/no-extraneous-dependencies": 0,
    "no-console": 0,
    "spaced-comment": [
      "error",
      "always",
      {
        line: {
          markers: ["/"],
          exceptions: ["-", "+"],
        },
        block: {
          markers: ["!"],
          exceptions: ["*"],
          balanced: true,
        },
      },
    ],
  },
};
