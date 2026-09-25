const path = require("path");

module.exports = {
  webpack: {
    alias: {
      "@": path.resolve(__dirname, "src"),
    },
  },
  devServer: (devServerConfig) => ({
    ...devServerConfig,
    client: {
      ...devServerConfig.client,
      overlay: {
        errors: true,
        warnings: false,
        runtimeErrors: (error) =>
          !/translate-page|chrome-extension:\/\/|moz-extension:\/\//.test(
            `${error?.message ?? ""} ${error?.stack ?? ""}`,
          ),
      },
    },
  }),
  style: {
    postcss: {
      mode: "file",
    },
  },
  jest: {
    configure: (jestConfig) => ({
      ...jestConfig,
      moduleNameMapper: {
        ...jestConfig.moduleNameMapper,
        "^@/(.*)$": "<rootDir>/src/$1",
        "^#prehydration/tabs/indicator$":
          "<rootDir>/node_modules/@base-ui/react/internals/prehydrationScript.stub.js",
        "^#formatErrorMessage$": "@base-ui/utils/formatErrorMessage",
        "^jotai/(utils|react|vanilla)$": "<rootDir>/node_modules/jotai/dist/$1.js",
        "^jotai$": "<rootDir>/node_modules/jotai/dist/index.js",
      },
      transformIgnorePatterns: [
        "[/\\\\]node_modules[/\\\\](?!(date-fns|@date-fns|react-day-picker|jotai)[/\\\\]).+\\.(js|jsx|mjs|cjs|ts|tsx)$",
        "^.+\\.module\\.(css|sass|scss)$",
      ],
    }),
  },
};
