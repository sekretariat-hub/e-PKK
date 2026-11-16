import { defineConfig } from "vitest/config";
import path from "node:path";
// tsconfig memakai jsx "preserve" untuk Next; untuk tes, JSX diubah otomatis (runtime automatic).
export default defineConfig({ oxc: { jsx: { runtime: "automatic" } }, resolve: { alias: { "@": path.resolve(__dirname, "src") } }, test: { environment: "node" } } as any);
