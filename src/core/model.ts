import { TFile } from "obsidian";
import { DefFileType } from "./file-type";

export interface PersonMetadata {
	id: string; // Unique identifier for the person
	fullName: string;
	position: string;
	department: string;
	notes: string;
	file: TFile;
	linkText: string;
	fileType: DefFileType;
	filePosition?: FilePosition;
	// Company info derived from file
	companyName?: string;
	companyLogo?: string;
	companyColor?: string;
	companyUrl?: string;
}

export interface FilePosition {
	from: number;
	to: number;
}

/**
 * Generate a unique ID for a person based on their name and file path
 */
export function generatePersonId(fullName: string, filePath: string): string {
	// Create a deterministic ID based on name and file path
	const normalizedName = fullName.toLowerCase().replace(/\s+/g, '-');
	const normalizedPath = filePath.replace(/[^a-zA-Z0-9]/g, '-');
	return `${normalizedName}-${normalizedPath}`;
}
