/**
 * Jest setup file for People Metadata Plugin tests
 * This file runs before each test suite
 */

// Mock console methods to reduce noise during testing
const originalConsoleLog = console.log;
const originalConsoleError = console.error;
const originalConsoleWarn = console.warn;

// Only show console output if VERBOSE_TESTS environment variable is set
if (!process.env.VERBOSE_TESTS) {
    console.log = jest.fn();
    console.warn = jest.fn();
    // Keep console.error for actual errors
    console.error = jest.fn((message) => {
        if (message && typeof message === 'string' && message.includes('Error')) {
            originalConsoleError(message);
        }
    });
}

// Global test utilities
global.testUtils = {
    // Restore console methods for debugging
    enableConsole: () => {
        console.log = originalConsoleLog;
        console.error = originalConsoleError;
        console.warn = originalConsoleWarn;
    },
    
    // Disable console methods
    disableConsole: () => {
        console.log = jest.fn();
        console.error = jest.fn();
        console.warn = jest.fn();
    },
    
    // Create a delay for testing async operations
    delay: (ms: number) => new Promise(resolve => setTimeout(resolve, ms)),
    
    // Generate test data
    generateTestPerson: (name: string, company: string) => ({
        id: `${name.toLowerCase().replace(/\s+/g, '-')}-${company.toLowerCase().replace(/\s+/g, '-')}`,
        fullName: name,
        position: "Test Position",
        department: "Test Department",
        notes: `Test notes for ${name}`,
        file: { path: `${company.toLowerCase()}.md` },
        linkText: name,
        fileType: "consolidated" as any,
        companyName: company,
        companyLogo: `${company.toLowerCase()}-logo.png`,
        companyColor: "blue",
        companyUrl: `https://${company.toLowerCase()}.com`
    })
};

// Mock performance.now for consistent timing tests
Object.defineProperty(global, 'performance', {
    value: {
        now: jest.fn(() => Date.now())
    }
});

// Mock localStorage for settings tests
const localStorageMock = {
    getItem: jest.fn(),
    setItem: jest.fn(),
    removeItem: jest.fn(),
    clear: jest.fn(),
};
Object.defineProperty(global, 'localStorage', {
    value: localStorageMock
});

// Add custom matchers
expect.extend({
    toBeWithinRange(received: number, floor: number, ceiling: number) {
        const pass = received >= floor && received <= ceiling;
        if (pass) {
            return {
                message: () => `expected ${received} not to be within range ${floor} - ${ceiling}`,
                pass: true,
            };
        } else {
            return {
                message: () => `expected ${received} to be within range ${floor} - ${ceiling}`,
                pass: false,
            };
        }
    },
    
    toHaveValidPersonMetadata(received: any) {
        const requiredFields = ['id', 'fullName', 'position', 'department', 'notes', 'file', 'linkText', 'fileType'];
        const missingFields = requiredFields.filter(field => !(field in received));
        
        if (missingFields.length === 0) {
            return {
                message: () => `expected object not to have valid PersonMetadata structure`,
                pass: true,
            };
        } else {
            return {
                message: () => `expected object to have valid PersonMetadata structure, missing: ${missingFields.join(', ')}`,
                pass: false,
            };
        }
    }
});

// Declare custom matchers for TypeScript
declare global {
    namespace jest {
        interface Matchers<R> {
            toBeWithinRange(floor: number, ceiling: number): R;
            toHaveValidPersonMetadata(): R;
        }
    }
    
    var testUtils: {
        enableConsole: () => void;
        disableConsole: () => void;
        delay: (ms: number) => Promise<void>;
        generateTestPerson: (name: string, company: string) => any;
    };
}

// Setup and teardown
beforeEach(() => {
    // Clear all mocks before each test
    jest.clearAllMocks();
    
    // Reset localStorage mock
    localStorageMock.getItem.mockClear();
    localStorageMock.setItem.mockClear();
    localStorageMock.removeItem.mockClear();
    localStorageMock.clear.mockClear();
});

afterEach(() => {
    // Clean up any timers
    jest.clearAllTimers();
});

// Global error handler for unhandled promise rejections
process.on('unhandledRejection', (reason, promise) => {
    console.error('Unhandled Rejection at:', promise, 'reason:', reason);
});

export {};
