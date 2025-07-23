import { App, Modal } from "obsidian";

export class AboutPeopleMetadataModal extends Modal {
	constructor(app: App) {
		super(app);
	}

	onOpen() {
		const { contentEl } = this;
		contentEl.empty();
		contentEl.addClass("about-people-metadata-modal");

		// Set modal dimensions for optimal viewing
		this.modalEl.style.width = "min(1100px, 98vw)";
		this.modalEl.style.height = "95vh";
		this.modalEl.style.maxHeight = "95vh";

		this.createModalContent(contentEl);

		// Ensure modal opens at the top - multiple attempts for reliability
		contentEl.scrollTop = 0;
		setTimeout(() => {
			contentEl.scrollTop = 0;
		}, 0);
		setTimeout(() => {
			contentEl.scrollTop = 0;
		}, 50);
	}

	private createModalContent(container: HTMLElement) {
		// Header Section
		this.createHeader(container);

		// Creator Information
		this.createCreatorSection(container);

		// Plugin Objectives
		this.createObjectivesSection(container);

		// Core Features
		this.createFeaturesSection(container);

		// Advanced Features
		this.createAdvancedFeaturesSection(container);

		// Resources & Links
		this.createResourcesSection(container);

		// Version Information
		this.createVersionSection(container);
	}

	private createHeader(container: HTMLElement) {
		const header = container.createDiv({ cls: "about-modal-header" });
		
		const title = header.createEl("h1", { 
			text: "Obsidian People Metadata",
			cls: "about-modal-title"
		});

		const description = header.createEl("p", {
			text: "A powerful tool for managing and looking up people metadata within your notes",
			cls: "about-modal-description"
		});
	}

	private createCreatorSection(container: HTMLElement) {
		const section = container.createDiv({ cls: "about-modal-section" });
		
		section.createEl("h2", { text: "Creator Information" });
		
		const creatorInfo = section.createDiv({ cls: "creator-info" });
		creatorInfo.createEl("p", { text: "👨‍💻 Creator: Adar Bahar" });
		creatorInfo.createEl("p", { text: "❤️ Built for the Obsidian community with love" });
	}

	private createObjectivesSection(container: HTMLElement) {
		const section = container.createDiv({ cls: "about-modal-section" });
		
		section.createEl("h2", { text: "Plugin Objectives" });
		
		const objectives = [
			"Augment names in your Obsidian pages with rich company and position details",
			"Create comprehensive company profiles with custom colors and logos",
			"Track mention counts and relationships across your entire vault",
			"Provide instant previews and smart tooltips for people information",
			"Optimize performance for large datasets with advanced search capabilities"
		];

		const objectivesList = section.createEl("ul", { cls: "objectives-list" });
		objectives.forEach(objective => {
			objectivesList.createEl("li", { text: objective });
		});
	}

	private createFeaturesSection(container: HTMLElement) {
		const section = container.createDiv({ cls: "about-modal-section" });
		
		section.createEl("h2", { text: "Core Features" });
		
		const features = [
			{ icon: "🏢", name: "Company Management", desc: "Organize people by company with custom colors and logos" },
			{ icon: "💬", name: "Smart Tooltips", desc: "Hover over names to see rich person details with mention counts" },
			{ icon: "➕", name: "Add Person Modal", desc: "User-friendly interface for adding new people" },
			{ icon: "⚡", name: "Name Auto-completion", desc: "Intelligent name suggestions with trigger patterns" },
			{ icon: "🔄", name: "Auto-Registration", desc: "Automatically set up new files in the People folder" },
			{ icon: "📊", name: "Mention Counting", desc: "Track how many times people are mentioned across your vault" },
			{ icon: "🎯", name: "Performance Optimization", desc: "Optimized search engine for large datasets (1000+ people)" },
			{ icon: "📥", name: "CSV Import", desc: "Bulk import people data from CSV files" },
			{ icon: "📱", name: "Mobile Support", desc: "Works seamlessly on both desktop and mobile" },
			{ icon: "🎨", name: "Color Coding", desc: "Assign colors to companies for visual organization" }
		];

		const featuresList = section.createDiv({ cls: "features-grid" });
		features.forEach(feature => {
			const featureItem = featuresList.createDiv({ cls: "feature-item" });
			featureItem.createSpan({ text: feature.icon, cls: "feature-icon" });
			const featureContent = featureItem.createDiv({ cls: "feature-content" });
			featureContent.createEl("strong", { text: feature.name });
			featureContent.createEl("span", { text: ` - ${feature.desc}` });
		});
	}

	private createAdvancedFeaturesSection(container: HTMLElement) {
		const section = container.createDiv({ cls: "about-modal-section" });
		
		section.createEl("h2", { text: "Advanced Features" });
		
		const advancedFeatures = [
			{ icon: "🔍", name: "Smart Search", desc: "Distinguish between task mentions and text mentions" },
			{ icon: "⚡", name: "Performance Monitoring", desc: "Real-time statistics and performance metrics" },
			{ icon: "💾", name: "Memory Efficiency", desc: "Advanced caching and compressed data structures" },
			{ icon: "🎯", name: "Fuzzy Matching", desc: "Find people even with typos or partial names" },
			{ icon: "🔄", name: "Auto-Refresh", desc: "Automatically update mention counts when files are modified" },
			{ icon: "📈", name: "Scalability", desc: "Handles large datasets without performance degradation" }
		];

		const advancedList = section.createDiv({ cls: "features-grid" });
		advancedFeatures.forEach(feature => {
			const featureItem = advancedList.createDiv({ cls: "feature-item" });
			featureItem.createSpan({ text: feature.icon, cls: "feature-icon" });
			const featureContent = featureItem.createDiv({ cls: "feature-content" });
			featureContent.createEl("strong", { text: feature.name });
			featureContent.createEl("span", { text: ` - ${feature.desc}` });
		});
	}

	private createResourcesSection(container: HTMLElement) {
		const section = container.createDiv({ cls: "about-modal-section" });
		
		section.createEl("h2", { text: "Resources & Support" });
		
		const resourcesGrid = section.createDiv({ cls: "resources-grid" });
		
		// Documentation Link
		const docLink = resourcesGrid.createDiv({ cls: "resource-item" });
		docLink.createSpan({ text: "📚", cls: "resource-icon" });
		const docContent = docLink.createDiv({ cls: "resource-content" });
		docContent.createEl("strong", { text: "Documentation & Source Code" });
		const docLinkEl = docContent.createEl("a", {
			text: "GitHub Repository",
			href: "https://github.com/AdarBahar/Obsidian-people-data"
		});
		docLinkEl.setAttribute("target", "_blank");

		// Issues Link
		const issuesLink = resourcesGrid.createDiv({ cls: "resource-item" });
		issuesLink.createSpan({ text: "🐛", cls: "resource-icon" });
		const issuesContent = issuesLink.createDiv({ cls: "resource-content" });
		issuesContent.createEl("strong", { text: "Report Issues & Feature Requests" });
		const issuesLinkEl = issuesContent.createEl("a", {
			text: "GitHub Issues",
			href: "https://github.com/AdarBahar/Obsidian-people-data/issues"
		});
		issuesLinkEl.setAttribute("target", "_blank");
	}

	private createVersionSection(container: HTMLElement) {
		const section = container.createDiv({ cls: "about-modal-section about-modal-footer" });
		
		const versionInfo = section.createDiv({ cls: "version-info" });
		versionInfo.createEl("p", { text: "🔖 Plugin Version: 1.1.0" });
		versionInfo.createEl("p", { text: "📄 License: MIT" });
		versionInfo.createEl("p", { text: "🚀 Built with TypeScript and Obsidian API" });
	}

	onClose() {
		const { contentEl } = this;
		contentEl.empty();
	}
}
