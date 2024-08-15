module.exports = {
  preset: "ts-jest",
  testEnvironment: "jsdom",
  testRunner: "jest-circus/runner",
  testPathIgnorePatterns: ["/node_modules/", "/dist/"],
  transform: {
    "^.+\\.vue$": "@vue/vue3-jest",
    "^.+\\.(ts|tsx)?$": ["ts-jest", { tsconfig: "tsconfig.json" }],
  },
  moduleFileExtensions: ["ts", "tsx", "js", "jsx", "json", "node", "vue"],
  moduleNameMapper: {
    "^@/(.*)$": "<rootDir>/src/$1", // Add this line to map the "@" alias
    "^@vue/test-utils": "<rootDir>/node_modules/@vue/test-utils/dist/vue-test-utils.cjs.js",
  },
  setupFilesAfterEnv: ["./jest.setup.ts"],
};
