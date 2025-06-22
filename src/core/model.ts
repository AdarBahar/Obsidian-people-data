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
	// Mention counts across vault (excluding People/Company pages)
	mentionCounts?: MentionCounts;
}

export interface MentionCounts {
	totalMentions: number;    // Total mentions across all pages
	taskMentions: number;     // Mentions within tasks (- [ ] or - [x])
	textMentions: number;     // Regular text mentions (not in tasks)
}

export interface FilePosition {
	from: number;
	to: number;
}
