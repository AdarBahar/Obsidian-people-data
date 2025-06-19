import { TFile } from "obsidian";
import { DefFileType } from "./file-type";

export interface PersonMetadata {
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
}

export interface FilePosition {
	from: number;
	to: number;
}
