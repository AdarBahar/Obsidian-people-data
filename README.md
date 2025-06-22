# Obsidian People Metadata

Augment names in your Obsidian pages with company, position and details.
A powerful tool for managing and looking up people metadata within your notes. Create company profiles, add person details, get instant previews with company colors and logos, track mention counts, and enjoy optimized performance for large datasets.

![Person Tooltip Preview](./img/person-tooltip.png)

## 🚀 Installation

### From Obsidian Community Plugins (Recommended)
1. Open Obsidian Settings
2. Go to Community Plugins and disable Safe Mode
3. Click Browse and search for "People Metadata"
4. Install and enable the plugin

### Manual Installation
1. Download the latest release from [GitHub Releases](https://github.com/AdarBahar/Obsidian-people-data/releases)
2. Extract the files to your vault's `.obsidian/plugins/people-metadata/` folder
3. Enable the plugin in Obsidian Settings → Community Plugins

## ✨ Features

### Core Features
- **🏢 Company Management**: Organize people by company with custom colors and logos
- **💬 Smart Tooltips**: Hover over names to see rich person details with mention counts
- **➕ Add Person Modal**: User-friendly interface for adding new people
- **⚡ Name Auto-completion**: Intelligent name suggestions with trigger patterns (e.g., `@name:`)
- **🔄 Auto-Registration**: Automatically set up new files in the People folder
- **🖼️ Logo Fallback**: Graceful fallback for broken company logos
- **📱 Mobile Support**: Works seamlessly on both desktop and mobile
- **🎨 Color Coding**: Assign colors to companies for visual organization
- **📝 Rich Formatting**: Support for markdown in person descriptions

### Advanced Features
- **📊 Mention Counting**: Track how many times people are mentioned across your vault
- **🔍 Smart Search**: Distinguish between task mentions and text mentions
- **🔄 Auto-Refresh**: Automatically update mention counts when files are modified
- **⚡ Performance Optimization**: Optimized search engine for large datasets (1000+ people)
- **💾 Memory Efficiency**: Advanced caching and compressed data structures
- **📈 Performance Monitoring**: Real-time statistics and performance metrics
- **🎯 Fuzzy Matching**: Find people even with typos or partial names
- **📋 CSV Import**: Import people data from CSV files with automatic processing

## 📖 Basic Usage

1. Create a folder, right-click on the folder in your file explorer, and select `Set people metadata folder`. This registers the folder as your people metadata folder.
2. Within the folder, create metadata files (with any name of your choice).
3. Add a person metadata entry using the `Add a Person` command. This will display a user-friendly modal where you can input the person's details and choose which company they belong to.
4. Once a person metadata entry is added, the person's name should be underlined in your notes. You may preview the metadata by hovering over the underlined name with the mouse, or triggering the `Preview person metadata` command when your cursor is on the name.
5. Use name auto-completion by typing `@name:` followed by the beginning of a person's name to get intelligent suggestions with company and position information.

### Editor menu

Options available:
- Go to person metadata (jump to metadata of person)
- Add a Person (add a new person to an existing company or create a new company)
- Edit person metadata (right-click on an underlined metadata entry)

### Commands

You may want to assign hotkeys to the commands available for easy access:

#### Core Commands
- **Add a Person**: Create new person entries with company selection
- **Insert name autocomplete trigger**: Insert the trigger pattern for name suggestions
- **Refresh people**: Reload all people data and rebuild indexes
- **Update company colors**: Apply color schemes to company decorations

#### Advanced Commands
- **Refresh mention counts**: Update mention statistics across your vault
- **Import People from CSV**: Bulk import people data from CSV files
- **Toggle optimized search**: Switch between legacy and optimized search engines
- **Show search performance statistics**: View detailed performance metrics
- **Rebuild optimized search indexes**: Force rebuild of search indexes for better performance

## How it works

**Note Metadata** does not maintain any hidden metadata files for your people metadata. 
All metadata entries are placed in your vault and form part of your notes.
You will notice that added metadata entries will create entries within your selected metadata file. 
You may edit these entries freely to add/edit your metadata, but if you do so, make sure to adhere strictly to the metadata rules below.
**It is recommended that you read through the metadata rules first before manually editing the metadata files.**

### Metadata rules

Currently, there are two types of metadata files: `consolidated` and `atomic`.
The type of metadata file is specified in the `def-type` frontmatter (or property) of a file.
For all metadata files you create, the `def-type` frontmatter should be set to either 'consolidated' or 'atomic'.
For compatibility reasons, a file is treated to be `consolidated` if the `def-type` frontmatter is not specified (but this is not guaranteed to remain the same in subsequent releases, so always specify the frontmatter when creating a new metadata file). 
For convenience, use the commands provided to add the `def-type` frontmatter.

#### Consolidated metadata file

A `consolidated` file type refers to a file that can contain many metadata entries for people within the same company.
Register a metadata file by specifying the `def-type: consolidated` frontmatter.

A `consolidated` metadata file is parsed according to the following rules:

1. The **file name** represents the **company name** (e.g., `TechCorp.md` represents TechCorp company).
2. The **frontmatter** can optionally contain a company color setting using the `color` property. You can use either predefined color names (e.g., `color: "blue"`) or hex codes (e.g., `color: "#0066cc"`). This color will be used for the double underline decoration of all people in this company.
3. The **first line** (after frontmatter) can optionally contain a company logo using markdown image syntax (e.g., `![Company Logo](logo.png)`). If the logo image fails to load or is broken, a default logo will be displayed showing the first two letters of the company name.
4. A metadata block consists of a **full name, job position, department, and notes**. They must be provided **strictly** in that order.
4. A full name is denoted with a line in the following format `# <name>`. This is rendered as a markdown header in Obsidian.
5. A job position is specified with a line starting with `Position: `.
6. A department is specified with a line starting with `Department: `.
7. A line that occurs after a registered **full name** and is not a position or department is deemed to be notes. Notes can be multi-line. All subsequent lines are notes until the metadata block divider is encountered. You may write markdown here, which will be formatted similar to Obsidian's markdown formatting.
8. A line with nothing but three hyphens `---` is used as a divider to separate metadata blocks. This is rendered as a delimiting line in Obsidian. (This divider can be configured in the settings to recognise three underscores `___` as well)

Example metadata file (`TechCorp.md`):

> ```
> ---
> def-type: consolidated
> color: "blue"
> ---
>
> ![TechCorp Logo](logo.png)
>
> # John Doe
> Position: Developer
> Department: Engineering
>
> Notes about John Doe.
> These notes can span several lines.
> They will end when the divider is reached.
>
> ---
>
> # Jane Smith
> Position: Manager
> Department: Management
>
> Notice that the last entry in the file does not need to have a divider, although it is still valid to have one.
> ```

### Available Color Names

You can use predefined color names instead of hex codes:

**Primary Colors:** `blue`, `red`, `green`, `orange`, `purple`, `teal`
**Secondary Colors:** `navy`, `crimson`, `forest`, `amber`, `violet`, `cyan`
**Muted Colors:** `slate`, `rose`, `lime`, `indigo`, `pink`, `brown`
**Custom Colors:** `mint`, `coral`, `lavender`, `gold`, `silver`, `bronze`

See [COMPANY_COLORS.md](documentation/COMPANY_COLORS.md) for the complete list with color previews.

## Auto-Registration and Template Generation

The plugin automatically handles new files in the People folder in two scenarios:

### When Creating New Files
When you create a new markdown file in the People folder, the plugin will automatically:
1. **Add the required frontmatter** (`def-type: consolidated`)
2. **Apply the "People" label** in the file explorer
3. **Add a basic template** (if the file is empty)

### When Opening Empty Files
When you open an empty markdown file in the People folder, the plugin will automatically:
1. **Detect that it's empty** and lacks People metadata
2. **Add the complete template** with:
   - Page properties (`def-type: consolidated`, `color: "blue"`)
   - Company logo placeholder
   - Example person entries with proper formatting
   - Dividing lines between entries

### Template Structure
```yaml
---
def-type: consolidated
color: "blue"
---

![Company Logo](logo.png)

# Person Name
Position: Job Title
Department: Department Name

Notes about this person go here.

---

# Another Person
Position: Another Job Title
Department: Another Department

Notes about the second person.

---
```

This can be disabled in Settings → "Auto-register new files" if you prefer manual control.

## ⚡ Name Auto-completion

The Name Auto-completion feature provides intelligent suggestions for people names from your metadata database when you type a specific trigger pattern.

### How to Use
1. **Type the trigger**: `@name:` (default, customizable in settings)
2. **Start typing a name**: Begin typing a person's name or leave empty for popular suggestions
3. **Select from suggestions**: Use arrow keys or mouse to choose from rich suggestions
4. **Insert the name**: Press Enter or click to insert the full person name

### Features
- **Smart Suggestions**: Shows name, company, position, and mention counts
- **Optimized Performance**: Leverages the optimized search engine for instant results
- **Customizable Trigger**: Change the trigger pattern in settings (e.g., `@@`, `#person:`)
- **Popular People**: Empty queries show most-mentioned people first
- **Company Colors**: Visual indicators show company colors in suggestions
- **Fallback Support**: Works with both optimized and legacy search engines

### Example Usage
```
Meeting notes with @name:John
```
This will show suggestions like:
- **John Doe** (Tech Corp, Software Engineer) [5 mentions]
- **John Smith** (Design Co, Product Manager) [2 mentions]

### Settings
- **Enable/disable**: Settings → People Metadata → Name Auto-completion
- **Custom trigger**: Change from `@name:` to your preferred pattern
- **Performance**: Uses optimized search when enabled for better performance

### Commands
- **Insert name autocomplete trigger**: Quickly insert the trigger pattern at cursor

See [NAME_AUTOCOMPLETE.md](documentation/NAME_AUTOCOMPLETE.md) for detailed documentation.

## 📊 Mention Counting & Analytics

The plugin automatically tracks how many times people are mentioned across your vault, providing valuable insights into your network and relationships.

### Features
- **Smart Detection**: Distinguishes between task mentions (`- [ ] Follow up with John Doe`) and text mentions (`John Doe suggested...`)
- **Real-time Updates**: Automatically refreshes counts when files are modified
- **Tooltip Integration**: Mention counts appear directly in person tooltips
- **Performance Optimized**: Uses efficient caching and debounced updates

### How It Works
1. **Automatic Scanning**: The plugin scans your vault for people mentions
2. **Smart Categorization**: Separates task-related mentions from general text mentions
3. **Live Updates**: Counts update automatically as you edit files (with 2-3 second delay)
4. **Tooltip Display**: Hover over any person name to see their mention statistics

### Mention Count Display
- **📝 5 mentions (✅ 2 tasks, 💬 3 text)**: Shows breakdown of mention types
- **📝 3 mentions (✅ tasks only)**: Only task mentions found
- **📝 2 mentions (💬 text only)**: Only text mentions found
- **🔄 Refresh button**: Click to manually update counts for that person

### Settings
- **Auto-refresh mention counts**: Enable/disable automatic updates (default: enabled)
- **Manual refresh**: Use "Refresh mention counts" command for full vault scan

## ⚡ Performance Optimization

For users with large datasets (500+ people), the plugin includes an advanced optimization system that dramatically improves performance.

### Optimization Features
- **Multi-Index Search Engine**: Separate indexes for names, companies, prefixes, and fuzzy matching
- **Compressed Prefix Trees**: 50-70% memory reduction through path compression
- **Smart Caching**: LRU cache with 95%+ hit rates for repeated searches
- **Adaptive Scanning**: Multiple scanning strategies with automatic fallback
- **Performance Monitoring**: Real-time statistics and performance metrics

### Performance Benefits
- **🚀 10x faster** name lookups through multi-index system
- **💾 70% less memory** usage with compressed data structures
- **📈 Sub-millisecond** average scan times
- **🔄 Handles 1000+ people** without performance degradation

### How to Enable
1. Go to **Settings → People Metadata**
2. Enable **"Use optimized search"**
3. Run **"Rebuild optimized search indexes"** command
4. Monitor performance with **"Show search performance statistics"**

### When to Use Optimization
- **Large datasets**: 500+ people or companies
- **Performance issues**: Slow tooltip display or typing lag
- **Memory concerns**: High memory usage with large vaults
- **Frequent searches**: Heavy use of people lookups

The optimization system is completely optional and maintains full backward compatibility with the legacy search system.

## 📥 CSV Import

Bulk import people data from CSV files with automatic processing and organization.

### Supported CSV Format
```csv
Full Name,Company,Position,Department,Description
John Doe,Acme Corp,Software Engineer,Engineering,Experienced developer
Jane Smith,Tech Solutions,Product Manager,Product,Leads product development
```

### Import Process
1. Use **"Import People from CSV"** command
2. Select your CSV file
3. Review the import preview
4. Confirm to create people entries
5. Files are automatically organized by company

### Features
- **Automatic company creation**: Creates company files as needed
- **Duplicate detection**: Prevents duplicate entries
- **Progress tracking**: Shows import progress and results
- **Error handling**: Reports any issues during import
- **Summary report**: Creates detailed import summary in People folder

#### Atomic metadata file

An `atomic` metadata file refers to a file that contains only one metadata entry.
Register an atomic metadata file by specifying the `def-type: atomic` frontmatter.

An `atomic` metadata file is parsed according to the following rules:
1. The name of the file is the full name of the person
2. The contents of the file (excluding the frontmatter) form the metadata

## Company Logo Fallback

When a company logo image fails to load or is broken, the plugin automatically displays a default logo instead. The default logo shows the first two letters of the company name in a styled badge.

### Features:
- **Automatic detection**: The plugin detects when images fail to load
- **Graceful fallback**: Shows a clean default logo instead of broken image icons
- **Company initials**: Uses the first two letters of the company name (e.g., "TC" for "TechCorp")
- **Consistent styling**: Matches the overall design of the plugin
- **Accessibility**: Includes proper title attributes for screen readers

### How it works:
1. The plugin first attempts to load the specified company logo image
2. If the image fails to load (broken URL, missing file, network error), it automatically replaces it with a default logo
3. The default logo displays the company's initials in a styled badge
4. If no company name is available, it shows "CO" as a generic fallback

This ensures that company information is always displayed consistently, even when logo images are unavailable.

## Add a Person Modal

The "Add a Person" command provides a user-friendly interface for adding new people to your metadata system.

### Features:
- **Intuitive form fields**: Clear labels and helpful placeholders guide you through the process
- **Company selection**: Choose from existing companies or create a new one
- **Automatic file management**: The plugin handles file creation and organization
- **Form validation**: Ensures required information is provided

### Form Fields:
1. **Full Name** (required): The person's complete name (e.g., "John Smith")
2. **Job Title** (optional): Their position or role (e.g., "Dev Team Leader")
3. **Department** (optional): The department they work in (e.g., "Engineering")
4. **Description** (required): Notes and details about the person
5. **Choose Company**: Select an existing company or create a new one

### Company Options:
- **Existing Companies**: The dropdown shows all current companies by name
- **Create a new Company**: Automatically creates a new company file with proper template structure

### How it works:
1. Use the `Add a Person` command or right-click menu option
2. Fill in the person's information
3. Choose a company from the dropdown or select "Create a new Company"
4. Click Save to add the person to the selected company file

When creating a new company, the plugin automatically:
- Generates a company file name based on the person's last name
- Creates the file with proper frontmatter and template structure
- Registers it as a consolidated definition file
- Adds a placeholder logo that will use the default fallback

## Metadata context
> _TLDR:_ "Context" is synonymous with a metadata file. By specifying a context, you specify that you want to use specific metadata file(s) to source your metadata for the current note.

Metadata context refers to the repository of metadata that are available for the currently active note.
By default, all notes have no context (you can think of this as being globally-scoped).
This means that your newly-created notes will always have access to the combination of all metadata defined in your metadata files.

This behaviour can be overridden by specifying the "context" of your note.
Each metadata file that you have is taken to be a separate context (hence your metadata should be structured accordingly).
Once context(s) are declared for a note, it will only retrieve metadata from the specified contexts.
You can think of this as having a local scope for the note.
The note now sees only a limited subset of all your metadata.

### Usage

To add context to your note, you need to manually edit the note's properties.
Add a `def-context` property which is a `List` type containing a list of file paths corresponding to the selected metadata files.

### How it works

Context is specified by adding a `def-context` property to your note's frontmatter.
In source, it will look something like this:
```
---
def-context:
	- metadata/people1.md
	- metadata/people2.md
---
```

You can edit your properties directly using Obsidian's properties panel or by editing the frontmatter in source mode.

### Removing contexts

To remove contexts, simply remove the file path from the `def-context` property.
Or if you want to remove all contexts, you can delete the `def-context` property altogether.

## Refreshing people

Whenever you find that the plugin is not detecting certain people or people files, run the `Refresh people` command to manually get the plugin to read your people files.

## 🐛 Troubleshooting

### Plugin Not Working?
1. Make sure you have set a People metadata folder using the right-click menu
2. Try running the "Refresh people" command
3. Check that your files have the correct `def-type: consolidated` frontmatter
4. Open Developer Console (Cmd/Ctrl+Shift+I) to check for error messages

### Names Not Being Detected?
1. Ensure the person's name matches exactly (case-sensitive)
2. Run "Refresh people" command to reload the metadata
3. Check that the person file is in the correct People folder
4. Verify the prefix tree is built: run "Show search performance statistics"
5. Try disabling optimized search if enabled: Settings → People Metadata → Use optimized search → Off

### Company Colors Not Showing?
1. Run the "Update company colors" command
2. Verify the color property is set correctly in the company file frontmatter
3. Try using predefined color names instead of hex codes

### Mention Counts Not Updating?
1. Run "Refresh mention counts" command manually
2. Check if auto-refresh is enabled: Settings → People Metadata → Auto-refresh mention counts
3. Wait 2-3 seconds after editing files for automatic updates
4. Verify people are properly defined in People folder

### Performance Issues?
1. **Enable optimized search**: Settings → People Metadata → Use optimized search → On
2. **Rebuild indexes**: Run "Rebuild optimized search indexes" command
3. **Disable auto-refresh**: Turn off auto-refresh mention counts for large vaults
4. **Check performance stats**: Use "Show search performance statistics" to identify bottlenecks
5. **Clear caches**: Restart Obsidian to clear all caches

### CSV Import Issues?
1. **Check CSV format**: Ensure headers match expected format (Full Name, Company, Position, Department, Description)
2. **File encoding**: Use UTF-8 encoding for CSV files
3. **Large files**: Import in smaller batches for very large CSV files
4. **Check import summary**: Review the generated import summary for any errors

### Optimization Not Working?
1. **Verify settings**: Check that "Use optimized search" is enabled
2. **Rebuild indexes**: Run "Rebuild optimized search indexes" after enabling
3. **Check statistics**: Use performance statistics to verify optimization is active
4. **Fallback mode**: Plugin automatically falls back to legacy search if optimization fails

## 📚 Documentation

### User Guides
- **[Name Auto-completion Guide](documentation/NAME_AUTOCOMPLETE.md)** - Complete guide to intelligent name suggestions
- **[Color Guide](documentation/COMPANY_COLORS.md)** - Complete list of available colors with previews
- **[Testing Guide](documentation/TESTING_GUIDE.md)** - Step-by-step testing instructions for all features
- **[Optimization Guide](documentation/OPTIMIZATION_GUIDE.md)** - Comprehensive guide to performance optimization

### Technical Documentation
- **[Development Notes](documentation/)** - Additional documentation and examples
- **[Performance Benchmarks](documentation/OPTIMIZATION_GUIDE.md#performance-benefits)** - Detailed performance comparisons
- **[API Reference](documentation/OPTIMIZATION_GUIDE.md#technical-architecture)** - Technical architecture details

### Quick References
- **[Command Reference](#commands)** - Complete list of available commands
- **[Troubleshooting Guide](#-troubleshooting)** - Solutions to common issues
- **[CSV Import Format](#-csv-import)** - Supported CSV structure and examples

## 🤝 Support & Feedback

- **Issues**: [Report bugs or request features](https://github.com/AdarBahar/Obsidian-people-data/issues)
- **Discussions**: [Community discussions](https://github.com/AdarBahar/Obsidian-people-data/discussions)

I welcome any feedback on how to improve this tool. Please open a GitHub issue if you find any bugs or have ideas for features or improvements.

## 🛠️ Contributing

If you're a programmer and would like to see certain features implemented, I welcome and would be grateful for contributions. Please:

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Submit a pull request

For major changes, please open an issue first to discuss what you would like to change.

## 📄 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## 🙏 Acknowledgments

- Built for the [Obsidian](https://obsidian.md) community
- Inspired by the need for better people and company management in personal knowledge bases
