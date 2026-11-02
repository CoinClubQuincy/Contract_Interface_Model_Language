import { fileURLToPath } from "node:url";
import { defineConfig } from "vitest/config";

const src = (name: string) => fileURLToPath(new URL(`./packages/${name}/src/index.ts`, import.meta.url));

export default defineConfig({
  resolve: {
    alias: {
      "@ciml/core": src("core"),
      "@ciml/evm": src("ciml"),
      "@ciml/openapi": src("iml"),
      "@ciml/react": src("react"),
    },
  },
  test: {
    include: ["packages/*/test/**/*.test.{ts,tsx}", "conformance/**/*.test.ts", "scripts/**/*.test.ts"],
    testTimeout: 30_000,
  },
});
