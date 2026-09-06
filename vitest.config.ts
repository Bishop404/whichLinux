import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    // The invariant suite sweeps every reachable answer set; 5s is not enough.
    testTimeout: 60_000,
  },
});
