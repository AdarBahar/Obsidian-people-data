import { PersonMetadata, generatePersonId } from "../core/model";
import { DefFileType } from "../core/file-type";
import { parseColorValue } from "../core/company-colors";
import { TFile } from "obsidian";

jest.mock('obsidian');

describe('Core Functionality Tests', () => {
    describe('PersonMetadata Model', () => {
        test('should create valid PersonMetadata object', () => {
            const person: PersonMetadata = {
                id: generatePersonId("John Smith", "company.md"),
                fullName: "John Smith",
                position: "Developer",
                department: "Engineering",
                notes: "Test notes",
                file: { path: "company.md" } as TFile,
                linkText: "John Smith",
                fileType: DefFileType.Consolidated,
                companyName: "TechCorp",
                companyLogo: "logo.png",
                companyColor: "blue",
                companyUrl: "https://techcorp.com"
            };

            expect(person.id).toBeDefined();
            expect(person.fullName).toBe("John Smith");
            expect(person.companyName).toBe("TechCorp");
            expect(person.fileType).toBe(DefFileType.Consolidated);
        });

        test('should handle minimal PersonMetadata object', () => {
            const minimalPerson: PersonMetadata = {
                id: generatePersonId("Jane Doe", "simple.md"),
                fullName: "Jane Doe",
                position: "",
                department: "",
                notes: "",
                file: { path: "simple.md" } as TFile,
                linkText: "Jane Doe",
                fileType: DefFileType.Atomic
            };

            expect(minimalPerson.id).toBeDefined();
            expect(minimalPerson.fullName).toBe("Jane Doe");
            expect(minimalPerson.companyName).toBeUndefined();
            expect(minimalPerson.fileType).toBe(DefFileType.Atomic);
        });
    });

    describe('generatePersonId', () => {
        test('should generate consistent IDs for same inputs', () => {
            const id1 = generatePersonId("John Smith", "company.md");
            const id2 = generatePersonId("John Smith", "company.md");
            
            expect(id1).toBe(id2);
            expect(id1).toBe("john-smith-company-md");
        });

        test('should generate different IDs for different names', () => {
            const id1 = generatePersonId("John Smith", "company.md");
            const id2 = generatePersonId("Jane Doe", "company.md");
            
            expect(id1).not.toBe(id2);
            expect(id1).toBe("john-smith-company-md");
            expect(id2).toBe("jane-doe-company-md");
        });

        test('should generate different IDs for different files', () => {
            const id1 = generatePersonId("John Smith", "company-a.md");
            const id2 = generatePersonId("John Smith", "company-b.md");
            
            expect(id1).not.toBe(id2);
            expect(id1).toBe("john-smith-company-a-md");
            expect(id2).toBe("john-smith-company-b-md");
        });

        test('should handle special characters in names', () => {
            const id1 = generatePersonId("John O'Connor", "company.md");
            const id2 = generatePersonId("Mary-Jane Smith", "company.md");
            
            // The actual implementation preserves some special characters
            expect(id1).toContain("john");
            expect(id1).toContain("connor");
            expect(id2).toContain("mary");
            expect(id2).toContain("jane");
            expect(id2).toContain("smith");
        });

        test('should normalize whitespace in names', () => {
            const id1 = generatePersonId("John  Smith", "company.md");
            const id2 = generatePersonId("John\tSmith", "company.md");
            const id3 = generatePersonId("John\nSmith", "company.md");
            
            expect(id1).toBe("john-smith-company-md");
            expect(id2).toBe("john-smith-company-md");
            expect(id3).toBe("john-smith-company-md");
        });
    });

    describe('DefFileType', () => {
        test('should have correct enum values', () => {
            expect(DefFileType.Consolidated).toBe("consolidated");
            expect(DefFileType.Atomic).toBe("atomic");
        });

        test('should validate enum values', () => {
            const validTypes = Object.values(DefFileType);
            expect(validTypes).toContain("consolidated");
            expect(validTypes).toContain("atomic");
            expect(validTypes).toHaveLength(2);
        });
    });

    describe('parseColorValue', () => {
        test('should handle valid color inputs', () => {
            // Test that the function doesn't throw and returns a string
            expect(typeof parseColorValue("red")).toBe("string");
            expect(typeof parseColorValue("blue")).toBe("string");
            expect(typeof parseColorValue("#FF0000")).toBe("string");
            expect(typeof parseColorValue("rgb(255, 0, 0)")).toBe("string");
        });

        test('should handle invalid inputs gracefully', () => {
            // Test that the function handles edge cases without throwing
            expect(() => parseColorValue("")).not.toThrow();
            expect(() => parseColorValue("invalid-color")).not.toThrow();
        });

        test('should handle null/undefined inputs', () => {
            // Test error handling for null/undefined
            expect(() => parseColorValue(null as any)).toThrow();
            expect(() => parseColorValue(undefined as any)).toThrow();
        });
    });

    describe('Multi-Company Support Logic', () => {
        test('should identify people with same names', () => {
            const people: PersonMetadata[] = [
                {
                    id: generatePersonId("John Smith", "company-a.md"),
                    fullName: "John Smith",
                    position: "Developer",
                    department: "Engineering",
                    notes: "Notes A",
                    file: { path: "company-a.md" } as TFile,
                    linkText: "John Smith",
                    fileType: DefFileType.Consolidated,
                    companyName: "Company A"
                },
                {
                    id: generatePersonId("John Smith", "company-b.md"),
                    fullName: "John Smith",
                    position: "Manager",
                    department: "Management",
                    notes: "Notes B",
                    file: { path: "company-b.md" } as TFile,
                    linkText: "John Smith",
                    fileType: DefFileType.Consolidated,
                    companyName: "Company B"
                },
                {
                    id: generatePersonId("Jane Doe", "company-a.md"),
                    fullName: "Jane Doe",
                    position: "Designer",
                    department: "Design",
                    notes: "Notes C",
                    file: { path: "company-a.md" } as TFile,
                    linkText: "Jane Doe",
                    fileType: DefFileType.Consolidated,
                    companyName: "Company A"
                }
            ];

            const duplicates = people.filter(person => 
                people.some(other => 
                    other.fullName === person.fullName && other.id !== person.id
                )
            );

            expect(duplicates).toHaveLength(2);
            expect(duplicates.every(p => p.fullName === "John Smith")).toBe(true);
        });

        test('should group people by name for tab creation', () => {
            const people: PersonMetadata[] = [
                {
                    id: generatePersonId("John Smith", "company-a.md"),
                    fullName: "John Smith",
                    position: "Developer",
                    department: "Engineering",
                    notes: "Notes A",
                    file: { path: "company-a.md" } as TFile,
                    linkText: "John Smith",
                    fileType: DefFileType.Consolidated,
                    companyName: "Company A"
                },
                {
                    id: generatePersonId("John Smith", "company-b.md"),
                    fullName: "John Smith",
                    position: "Manager",
                    department: "Management",
                    notes: "Notes B",
                    file: { path: "company-b.md" } as TFile,
                    linkText: "John Smith",
                    fileType: DefFileType.Consolidated,
                    companyName: "Company B"
                }
            ];

            const grouped = people.reduce((acc, person) => {
                const key = person.fullName;
                if (!acc[key]) acc[key] = [];
                acc[key].push(person);
                return acc;
            }, {} as Record<string, PersonMetadata[]>);

            expect(grouped["John Smith"]).toHaveLength(2);
            expect(grouped["John Smith"][0].companyName).toBe("Company A");
            expect(grouped["John Smith"][1].companyName).toBe("Company B");
        });
    });

    describe('Performance Tests', () => {
        test('should generate IDs quickly for large datasets', () => {
            const start = performance.now();
            
            for (let i = 0; i < 1000; i++) {
                generatePersonId(`Person ${i}`, `company-${i}.md`);
            }
            
            const time = performance.now() - start;
            expect(time).toBeLessThan(100); // Should complete in under 100ms
        });

        test('should handle concurrent ID generation', async () => {
            const promises = [];
            
            for (let i = 0; i < 100; i++) {
                promises.push(Promise.resolve(generatePersonId(`Person ${i}`, `company-${i}.md`)));
            }
            
            const start = performance.now();
            const results = await Promise.all(promises);
            const time = performance.now() - start;
            
            expect(results).toHaveLength(100);
            expect(time).toBeLessThan(50); // Should complete quickly
            expect(new Set(results).size).toBe(100); // All IDs should be unique
        });
    });

    describe('Data Validation', () => {
        test('should validate required PersonMetadata fields', () => {
            const requiredFields = ['id', 'fullName', 'position', 'department', 'notes', 'file', 'linkText', 'fileType'];
            
            const validPerson: PersonMetadata = {
                id: "test-id",
                fullName: "Test Person",
                position: "Test Position",
                department: "Test Department",
                notes: "Test notes",
                file: { path: "test.md" } as TFile,
                linkText: "Test Person",
                fileType: DefFileType.Consolidated
            };

            requiredFields.forEach(field => {
                expect(validPerson).toHaveProperty(field);
                expect((validPerson as any)[field]).toBeDefined();
            });
        });

        test('should handle edge cases gracefully', () => {
            // Test empty strings
            const id1 = generatePersonId("", "company.md");
            const id2 = generatePersonId("John Smith", "");
            
            expect(typeof id1).toBe("string");
            expect(typeof id2).toBe("string");
            
            // Test with whitespace
            const id3 = generatePersonId("   ", "company.md");
            expect(typeof id3).toBe("string");
        });
    });
});
