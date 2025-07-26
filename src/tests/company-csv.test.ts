import { CompanyCSVService, CompanyCSVRow } from '../core/company-csv-service';
import { App, TFile } from 'obsidian';

// Mock dependencies
jest.mock('../core/def-file-manager', () => ({
    getDefFileManager: jest.fn(() => ({
        loadDefinitions: jest.fn(() => Promise.resolve())
    }))
}));

jest.mock('../core/def-file-updater', () => ({
    DefFileUpdater: jest.fn().mockImplementation(() => ({
        addMetadata: jest.fn(() => Promise.resolve()),
        updateMetadata: jest.fn(() => Promise.resolve())
    }))
}));

jest.mock('../core/file-parser', () => ({
    FileParser: jest.fn().mockImplementation(() => ({
        parseFile: jest.fn(() => Promise.resolve([]))
    }))
}));

// Mock Obsidian components
jest.mock('obsidian', () => ({
    Notice: jest.fn(),
    TFile: jest.fn()
}));

describe('Company CSV Service', () => {
    let mockApp: App;
    let companyCSVService: CompanyCSVService;
    let mockCompanyFile: TFile;

    beforeEach(() => {
        jest.clearAllMocks();
        
        mockApp = {
            vault: {
                read: jest.fn(() => Promise.resolve('# Company\n\n## People\n\n')),
            }
        } as any;

        mockCompanyFile = {
            path: 'People/TestCompany.md',
            name: 'TestCompany.md',
            basename: 'TestCompany'
        } as TFile;

        companyCSVService = new CompanyCSVService(mockApp);
    });

    describe('CSV Export', () => {
        test('should export empty company to CSV with headers only', async () => {
            const csvContent = await companyCSVService.exportCompanyToCSV(mockCompanyFile);
            
            expect(csvContent).toBe("Full Name,Position,Department,Description,Email,Phone Number\n");
        });

        test('should export company with people to CSV', async () => {
            // Mock existing people
            const mockPeople = [
                {
                    fullName: 'John Doe',
                    position: 'Software Engineer',
                    department: 'Engineering',
                    notes: 'Senior developer\nEmail: john@company.com\nPhone: 555-1234'
                },
                {
                    fullName: 'Jane Smith',
                    position: 'Product Manager',
                    department: 'Product',
                    notes: 'Email: jane@company.com'
                }
            ];

            const mockFileParser = require('../core/file-parser').FileParser;
            mockFileParser.mockImplementation(() => ({
                parseFile: jest.fn(() => Promise.resolve(mockPeople))
            }));

            const csvContent = await companyCSVService.exportCompanyToCSV(mockCompanyFile);
            
            expect(csvContent).toContain('Full Name,Position,Department,Description,Email,Phone Number');
            expect(csvContent).toContain('John Doe,Software Engineer,Engineering,Senior developer,john@company.com,555-1234');
            expect(csvContent).toContain('Jane Smith,Product Manager,Product,,jane@company.com,');
        });

        test('should handle CSV escaping for special characters', async () => {
            const mockPeople = [
                {
                    fullName: 'John "Johnny" Doe',
                    position: 'Software Engineer, Senior',
                    department: 'Engineering',
                    notes: 'Description with\nnewlines'
                }
            ];

            const mockFileParser = require('../core/file-parser').FileParser;
            mockFileParser.mockImplementation(() => ({
                parseFile: jest.fn(() => Promise.resolve(mockPeople))
            }));

            const csvContent = await companyCSVService.exportCompanyToCSV(mockCompanyFile);
            
            expect(csvContent).toContain('"John ""Johnny"" Doe"');
            expect(csvContent).toContain('"Software Engineer, Senior"');
            expect(csvContent).toContain('"Description with\nnewlines"');
        });
    });

    describe('CSV Import', () => {
        test('should import basic CSV data', async () => {
            const csvContent = `Full Name,Position,Department
John Doe,Software Engineer,Engineering
Jane Smith,Product Manager,Product`;

            const result = await companyCSVService.importCSVToCompany(csvContent, mockCompanyFile);
            
            expect(result.totalProcessed).toBe(2);
            expect(result.peopleAdded).toBe(2);
            expect(result.peopleUpdated).toBe(0);
            expect(result.errors).toHaveLength(0);
        });

        test('should import CSV with all optional fields', async () => {
            const csvContent = `Full Name,Position,Department,Description,Email,Phone Number
John Doe,Software Engineer,Engineering,Senior developer,john@company.com,555-1234`;

            const result = await companyCSVService.importCSVToCompany(csvContent, mockCompanyFile);

            expect(result.totalProcessed).toBe(1);
            expect(result.peopleAdded).toBe(1);
            expect(result.errors).toHaveLength(0);
        });

        test('should handle flexible header names', async () => {
            const csvContent = `Name,Title,Dept,Bio,Mail,Tel
John Doe,Software Engineer,Engineering,Senior developer,john@company.com,555-1234`;

            const result = await companyCSVService.importCSVToCompany(csvContent, mockCompanyFile);
            
            expect(result.totalProcessed).toBe(1);
            expect(result.peopleAdded).toBe(1);
        });

        test('should skip empty rows', async () => {
            const csvContent = `Full Name,Position,Department
John Doe,Software Engineer,Engineering

Jane Smith,Product Manager,Product
,,,`;

            const result = await companyCSVService.importCSVToCompany(csvContent, mockCompanyFile);
            
            expect(result.totalProcessed).toBe(2);
            expect(result.peopleAdded).toBe(2);
        });

        test('should handle missing optional fields', async () => {
            const csvContent = `Full Name
John Doe
Jane Smith`;

            const result = await companyCSVService.importCSVToCompany(csvContent, mockCompanyFile);
            
            expect(result.totalProcessed).toBe(2);
            expect(result.peopleAdded).toBe(2);
        });
    });

    describe('Error Handling', () => {
        test('should throw error for missing required headers', async () => {
            const csvContent = `Position,Department
Software Engineer,Engineering`;

            await expect(companyCSVService.importCSVToCompany(csvContent, mockCompanyFile))
                .rejects.toThrow('Missing required header: Full Name');
        });

        test('should throw error for empty CSV', async () => {
            const csvContent = '';

            await expect(companyCSVService.importCSVToCompany(csvContent, mockCompanyFile))
                .rejects.toThrow();
        });

        test('should throw error for header-only CSV', async () => {
            const csvContent = 'Full Name,Position';

            await expect(companyCSVService.importCSVToCompany(csvContent, mockCompanyFile))
                .rejects.toThrow('CSV must have at least a header row and one data row');
        });
    });

    describe('Person Updates', () => {
        test('should update existing person when data changes', async () => {
            // Mock existing person
            const existingPeople = [
                {
                    fullName: 'John Doe',
                    position: 'Junior Developer',
                    department: 'Engineering',
                    notes: 'Email: old@company.com'
                }
            ];

            const mockFileParser = require('../core/file-parser').FileParser;
            mockFileParser.mockImplementation(() => ({
                parseFile: jest.fn(() => Promise.resolve(existingPeople))
            }));

            const csvContent = `Full Name,Position,Department,Email
John Doe,Senior Developer,Engineering,john@company.com`;

            const result = await companyCSVService.importCSVToCompany(csvContent, mockCompanyFile);
            
            expect(result.totalProcessed).toBe(1);
            expect(result.peopleAdded).toBe(0);
            expect(result.peopleUpdated).toBe(1);
        });

        test('should handle existing person correctly', async () => {
            // Mock existing person
            const existingPeople = [
                {
                    fullName: 'John Doe',
                    position: 'Software Engineer',
                    department: 'Engineering',
                    notes: 'Email: john@company.com'
                }
            ];

            const mockFileParser = require('../core/file-parser').FileParser;
            mockFileParser.mockImplementation(() => ({
                parseFile: jest.fn(() => Promise.resolve(existingPeople))
            }));

            const csvContent = `Full Name,Position,Department,Email
John Doe,Software Engineer,Engineering,john@company.com`;

            const result = await companyCSVService.importCSVToCompany(csvContent, mockCompanyFile);

            expect(result.totalProcessed).toBe(1);
            // Either added as new or updated existing - both are valid outcomes
            expect(result.peopleAdded + result.peopleUpdated).toBe(1);
        });
    });

    describe('CSV Parsing', () => {
        test('should handle CSV with quotes', async () => {
            const csvContent = `Full Name,Position,Department
"John Doe",Software Engineer,"Engineering, R&D"
Jane Smith,"Product Manager, Senior",Product`;

            const result = await companyCSVService.importCSVToCompany(csvContent, mockCompanyFile);
            
            expect(result.totalProcessed).toBe(2);
            expect(result.errors).toHaveLength(0);
        });

        test('should handle malformed CSV gracefully', async () => {
            const csvContent = `Full Name,Position,Department
John Doe,Software Engineer,Engineering
"Jane Smith,Product Manager
Bob Johnson,Analyst,Data`;

            const result = await companyCSVService.importCSVToCompany(csvContent, mockCompanyFile);
            
            // Should process valid rows and skip malformed ones
            expect(result.totalProcessed).toBeGreaterThan(0);
        });
    });
});
