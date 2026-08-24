import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    include: ["packages/adapter-dsh/source-conformance/**/*.conformance.ts"],
  },
});
