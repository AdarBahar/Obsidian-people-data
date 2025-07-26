module.exports = {
    preset: "ts-jest",
    testEnvironment: "node",
	transform: {
		'^.+\\.ts$': 'ts-jest',
	},
	moduleDirectories: ["node_modules", "<rootDir>"],
	moduleFileExtensions: ["ts", "js"],
	roots: ["<rootDir>"],
	modulePaths: ["<rootDir>"],

	// Test coverage configuration
	collectCoverage: true,
	collectCoverageFrom: [
		"src/**/*.ts",
		"!src/**/*.d.ts",
		"!src/tests/**",
		"!src/**/*.test.ts"
	],
	coverageDirectory: "coverage",
	coverageReporters: ["text", "lcov", "html"],
	coverageThreshold: {
		global: {
			branches: 2,
			functions: 4,
			lines: 6,
			statements: 6
		}
	},

	// Test patterns
	testMatch: [
		"<rootDir>/src/tests/**/*.test.ts"
	],

	// Setup files
	setupFilesAfterEnv: ["<rootDir>/src/tests/setup.ts"]
};
