import { defineConfig } from "vitest/config";

export default defineConfig({
	test: {
		clearMocks: true,
		globals: true,
	},
	resolve: {
		conditions: ["dev-source"],
	},
});
