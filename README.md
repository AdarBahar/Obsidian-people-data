# Obsidian People Metadata

Augment names in your Obsidian pages with company, position and details.
A personal tool for managing and looking up people metadata within your notes. Create company profiles, add person details, and get instant previews with company colors and logos.

> **Latest Update (v1.2.0)**: Settings reorganization with improved hierarchy and terminology updates. Added People folder validation with startup alerts, auto-creation, and comprehensive help. Enhanced user experience with better error handling and clearer guidance.

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

- **🏢 Company Management**: Organize people by company with custom colors and logos
- **💬 Smart Tooltips**: Hover over names to see rich person details with interactive tabs
- **➕ Add Person Modal**: User-friendly interface for adding new people
- **📥 CSV Import/Export**: Bulk import/export with global and per-company management
- **🔄 Auto-Registration**: Automatically set up new files in the People folder
- **🖼️ Logo Fallback**: Graceful fallback for broken company logos
- **📱 Mobile Support**: Works seamlessly on both desktop and mobile
- **🎨 Color Coding**: Assign colors to companies for visual organization
- **📝 Rich Formatting**: Support for markdown in person descriptions
- **🔍 Name Auto-completion**: Smart auto-completion with configurable trigger patterns
- **🏷️ Multi-Company Support**: Handle people working at multiple companies with tabbed interface
- **⚙️ Extensive Configuration**: Customize tooltips, triggers, and visual appearance
- **📁 People Folder Validation**: Automatic validation with startup alerts and one-click folder creation
- **🎛️ Reorganized Settings**: Improved hierarchy, clearer terminology, and enhanced user experience

## 📖 Basic Usage

### 📁 Setting Up Your People Folder

The plugin will automatically check for your People folder when it loads. If the folder doesn't exist, you'll see:

- **Startup Notice**: A notification alerting you that the People folder is missing
- **Settings Alert**: A prominent red banner in plugin settings with action buttons

**Quick Setup Options:**
1. **One-Click Creation**: Click "Create People Folder" in the settings alert
2. **Manual Creation**: Create a folder named "People" in your vault
3. **Use Existing Folder**: Right-click any folder → "Set as people folder"

### 👥 Adding People

1. Within the People folder, create metadata files (with any name of your choice).
2. Add a person metadata entry using the `Add a Person` command. This will display a user-friendly modal where you can input the person's details and choose which company they belong to.
3. Once a person metadata entry is added, the person's name should be underlined in your notes. You may preview the metadata by hovering over the underlined name with the mouse, or triggering the `Preview person metadata` command when your cursor is on the name.

### Editor menu

Options available:
- Go to person metadata (jump to metadata of person)
- Add a Person (add a new person to an existing company or create a new company)
- Edit person metadata (right-click on an underlined metadata entry)

### Commands

You may want to assign hotkeys to the commands available for easy access:
- **Add a Person** - Open the person creation modal
- **Refresh people** - Reload all people metadata
- **Update company colors** - Apply company color schemes
- **Insert name auto-completion trigger** - Insert the trigger pattern for auto-completion
- **Configure companies** - Open company management interface
- **Force cleanup stuck tooltips** - Clean up any stuck tooltip elements
- **Test plugin status** - Check plugin initialization and data status
- **Refresh all (definitions, colors, UI)** - Comprehensive refresh of all plugin components

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

## 🔍 Name Auto-completion

The plugin includes a powerful auto-completion system that helps you quickly reference people in your notes.

### How to Use Auto-completion

1. **Type the trigger pattern** (default: `@name:`) in any note
2. **Start typing** a person's name, company, or position
3. **Select from suggestions** using arrow keys + Enter or mouse click
4. **Name is inserted** as clean text (e.g., "John Doe")

### Example Usage
```
Type: @name:john
See: John Doe @ TechCorp (Software Engineer) 5 mentions
Select: John Doe
```

### Auto-completion Features

- **Smart Scoring**: Prioritizes exact matches, then partial matches
- **Rich Suggestions**: Shows name, company, position, and mention counts
- **Configurable Trigger**: Customize the trigger pattern (e.g., `@name:`, `@person:`, `@`)
- **Performance Optimized**: Fast filtering with configurable suggestion limits
- **Keyboard Navigation**: Full keyboard support with arrow keys and Enter
- **Mouse Support**: Click to select suggestions

### Configuration Options

Access auto-completion settings in **Settings → People Metadata → Auto-completion settings**:

- **Enable/disable auto-completion**: Toggle the feature on/off
- **Trigger pattern**: Customize what triggers suggestions (default: `@name:`)
- **Maximum suggestions**: Control how many suggestions to show (3-20)
- **Show mention counts**: Display how often each person is mentioned
- **Show company information**: Include company names in suggestions
- **Show position information**: Include job titles in suggestions

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

## 💬 Smart Tooltips & Configuration

The plugin provides rich, interactive tooltips that display comprehensive person information when you hover over or click on names.

### Tooltip Features

- **Multi-Company Support**: Tabbed interface for people working at multiple companies
- **Interactive Content**: Click on tabs, links, and other elements within tooltips
- **Company Information**: Shows company name, logo, and person's role
- **Rich Formatting**: Supports markdown formatting in person descriptions
- **Smart Hover Behavior**: Tooltips stay open when interacting with content

### Tooltip Configuration

Access tooltip settings in **Settings → People Metadata**:

#### Trigger Settings
- **People popover trigger**: Choose between "Hover" or "Click" to show tooltips
- **People popover dismiss**: Choose between "Mouse exit" or "Click" to hide tooltips

#### Display Settings
- **Enable in reading view**: Show tooltips in reading mode
- **File explorer tags**: Show "PEOPLE" tags in file explorer (optional)

#### Advanced Settings
- **Popover delay**: Configure delay before showing tooltips (hover mode)
- **Company colors**: Automatically applied from company file settings
- **Logo fallback**: Automatic fallback for broken company logos

### Hover Behavior

When using **"Hover" trigger + "Mouse exit" dismiss**:
- Hover over a person's name → Tooltip appears
- Move mouse to tooltip → Tooltip stays open for interaction
- Click on tabs or links → Works seamlessly
- Move mouse away from both name and tooltip → Tooltip dismisses

This allows you to interact with multi-company tabs and click on links within the tooltip content.

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

## 📥 CSV Import/Export (Advanced Data Management)

Comprehensive CSV functionality for both bulk operations and per-company management.

### **🌐 Global CSV Import**
Import hundreds of people across multiple companies from a single CSV file.

- **Multi-Company Support**: Automatically organizes people by company
- **Flexible Format**: Supports various CSV column names
- **Automatic Organization**: Creates company files automatically
- **Duplicate Detection**: Prevents duplicate entries
- **Detailed Reports**: Comprehensive import summaries
- **Case-Insensitive Matching**: Handles company name variations intelligently

### **🏢 Per-Company CSV Management**
Granular import/export for individual companies with enhanced control.

- **Company-Specific Import**: Add people to specific companies
- **Rich Metadata Support**: Position, Department, Description, Email, Phone
- **Smart Updates**: Intelligently handles existing people
- **Export Functionality**: Download company data as CSV
- **Professional UI**: Integrated into company configuration modal
- **Duplicate Handling**: Updates existing people or adds new ones

### **📋 Supported CSV Formats**

**Global Import Format:**
```csv
Company,Full Name,Position,Department,Email,Phone Number
TechCorp,John Doe,Software Engineer,Engineering,john@tech.com,555-1234
DataSystems,Jane Smith,Product Manager,Product,jane@data.com,555-5678
```

**Per-Company Import Format:**
```csv
Full Name,Position,Department,Description,Email,Phone Number
John Doe,Software Engineer,Engineering,Senior developer with 5 years experience,john@tech.com,555-1234
Jane Smith,Product Manager,Product,Leads product strategy and roadmap,jane@company.com,555-5678
```

### **🚀 How to Use**

**Global CSV Import:**
1. Open Command Palette (`Ctrl/Cmd + P`)
2. Search for "Import People from CSV"
3. Paste multi-company CSV data
4. Import processes all companies at once

**Per-Company Management:**
1. Open Company Configuration modal
2. For existing companies: Click "📥 Import CSV" or "📤 Export CSV"
3. For new companies: Use "📥 Import CSV to New Company" during creation
4. Manage data with granular control

### **🔄 Duplicate Person Behavior**

When importing a person who already exists in a company:

1. **Case-insensitive name matching** (John Doe = john doe)
2. **Smart update detection** - only updates if data changed
3. **Notes merging** - combines new info with existing notes
4. **Position/Department updates** - overwrites with new data
5. **Email/Phone addition** - adds if not already present

**Update Logic:**
- **No change needed**: Person exists with same data → No action
- **Update required**: Person exists but data differs → Updates existing
- **New person**: Person doesn't exist → Adds new entry

### **📊 Import Summary**

After each import, a detailed summary is automatically created:

- **Import Statistics**: Total records processed, success/failure counts
- **Companies Added**: List of new companies created
- **People Added/Updated**: Count per company
- **Error Details**: Specific information about any failures
- **Timestamped Reports**: Easy to track import history

**[📖 Complete CSV Import Guide](documentation/CSV_IMPORT.md)**

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
2. Try running the **"Test plugin status"** command to check initialization
3. Run **"Refresh all (definitions, colors, UI)"** for comprehensive refresh
4. Check that your files have the correct `def-type: consolidated` frontmatter

### Names Not Being Detected?
1. Ensure the person's name matches exactly (case-sensitive)
2. Run **"Refresh people"** command to reload the metadata
3. Check that the person file is in the correct People folder
4. Use **"Test plugin status"** to verify how many people files are loaded

### Company Colors Not Showing?
1. Run the **"Update company colors"** command
2. Verify the color property is set correctly in the company file frontmatter
3. Try using predefined color names instead of hex codes
4. Company colors are now automatically applied on plugin load

### Auto-completion Not Working?
1. Check that auto-completion is enabled in **Settings → Auto-completion settings**
2. Verify the trigger pattern is correct (default: `@name:`)
3. Ensure you have people files loaded (use **"Test plugin status"**)
4. Try the **"Insert name auto-completion trigger"** command

### Tooltips Not Interactive?
1. Check tooltip settings: **Settings → People Metadata**
2. For interactive tooltips, use **"Hover" trigger + "Mouse exit" dismiss**
3. Run **"Force cleanup stuck tooltips"** if tooltips get stuck
4. Restart the plugin if hover behavior seems broken

### General Issues?
- Use **"Refresh all (definitions, colors, UI)"** for comprehensive refresh
- Check console (Developer Tools) for error messages
- Try disabling and re-enabling the plugin
- Use **"Test plugin status"** to diagnose specific issues

## 📚 Documentation

- **[Color Guide](documentation/COMPANY_COLORS.md)** - Complete list of available colors
- **[Development Notes](documentation/)** - Additional documentation and examples

## 🤝 Support & Feedback

- **Issues**: [Report bugs or request features](https://github.com/AdarBahar/Obsidian-people-data/issues)
- **Discussions**: [Community discussions](https://github.com/AdarBahar/Obsidian-people-data/discussions)

I welcome any feedback on how to improve this tool. Please open a GitHub issue if you find any bugs or have ideas for features or improvements.

## 🧪 Testing

The People Metadata Plugin includes a comprehensive test suite with **201 tests** covering all major functionality. The testing infrastructure ensures reliability, performance, and maintainability.

### Running Tests

#### Basic Test Commands
```bash
# Run all tests
npm test

# Run tests with coverage report
npm run test:coverage

# Run tests in watch mode (for development)
npm run test:watch

# Run tests with verbose output
npm run test:verbose
```

#### Coverage Reports
After running `npm run test:coverage`, you can view detailed coverage reports:
- **Terminal**: Coverage summary displayed in the console
- **HTML Report**: Open `coverage/lcov-report/index.html` in your browser for interactive coverage visualization

### Test Suite Overview

The plugin includes **11 comprehensive test suites** with **201 total tests**:

#### ✅ **Core Functionality Tests** (18 tests)
- PersonMetadata model validation and creation
- ID generation algorithms and consistency
- DefFileType enum validation
- Color parsing and validation
- Multi-company logic and grouping
- Performance benchmarks for large datasets

#### ✅ **Smart Line Scanner Tests** (19 tests)
- Multiple scanning strategies (prefix tree, word boundary, fuzzy matching)
- Caching mechanisms and performance optimization
- Performance metrics and timing analysis
- Error handling for malformed data

#### ✅ **Optimized Search Engine Tests** (22 tests)
- Index building and search functionality
- LRU caching and performance optimization
- Search quality and result prioritization
- Compressed prefix tree operations
- Memory management for large datasets

#### ✅ **Mention Counting Service Tests** (16 tests)
- File scanning and mention detection
- Statistics tracking and performance metrics
- Multi-company mention aggregation
- Error handling for file operations

#### ✅ **Auto-completion Tests** (26 tests)
- Trigger detection and pattern matching
- Suggestion generation and scoring
- User interaction handling
- Configuration integration and feature toggles

#### ✅ **Settings Tests** (14 tests)
- Configuration validation and structure verification
- Settings merging and partial updates
- Interface validation and constraint checking
- Enum validation for all configuration options

#### ✅ **Main Plugin Tests** (18 tests)
- Plugin initialization and system integration
- Command registration and functionality
- Event handling and workspace integration
- Error handling and graceful failure recovery

#### ✅ **Definition Popover Tests** (38 tests)
- Single and multi-company popover functionality
- Positioning and responsive behavior
- Content rendering and markdown support
- Event handling and user interaction

#### ✅ **Decorator Tests** (4 tests)
- Text decoration and styling
- Performance validation
- Edge case handling

#### ✅ **CSV Import Tests** (11 tests)
- Global CSV import functionality
- Multi-company data processing
- Error handling and validation
- Case-insensitive company matching

#### ✅ **Company CSV Tests** (15 tests)
- Per-company CSV import/export
- Rich metadata processing (position, department, description, email, phone)
- Smart duplicate detection and updates
- CSV format validation and parsing

### Coverage Statistics

The test suite achieves excellent coverage on critical components:

- **🟢 Optimized Search Engine**: 93.33% coverage
- **🟢 Smart Line Scanner**: 90.13% coverage
- **🟢 Mention Counting Service**: 80.55% coverage
- **🟢 Auto-completion**: 67.34% coverage
- **🟢 Core Model**: 100% coverage
- **🟢 File Types**: 100% coverage

**Overall Coverage**: 31.16% statements, 24.57% branches

### Testing Infrastructure

#### Professional Testing Framework
- **Jest** with TypeScript support
- **JSDOM** environment for DOM testing
- **Comprehensive Obsidian API mocking**
- **Performance benchmarking** with timing validations
- **Custom test utilities** and domain-specific matchers

#### Testing Standards
- **Arrange-Act-Assert** pattern throughout
- **Isolated testing** with proper mocking
- **Edge case coverage** for robustness
- **Performance validation** for efficiency
- **Error handling** for reliability

#### Development Benefits
- **🚀 Faster Debugging**: Issues caught early in development
- **💪 Complete Confidence**: All major functionality verified
- **🔧 Easy Maintainability**: Clear test structure for future changes
- **⚡ Performance Assurance**: Benchmarks ensure optimal performance
- **🛡️ Regression Prevention**: Comprehensive coverage prevents breaking changes

### Running Tests During Development

For active development, use watch mode to automatically run tests when files change:

```bash
npm run test:watch
```

This provides immediate feedback on code changes and helps maintain code quality during development.

## 🛠️ Contributing

If you're a programmer and would like to see certain features implemented, I welcome and would be grateful for contributions. Please:

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. **Run the test suite** to ensure your changes don't break existing functionality
5. **Add tests** for new features or bug fixes
6. Submit a pull request

For major changes, please open an issue first to discuss what you would like to change.

### Development Workflow

1. **Install dependencies**: `npm install`
2. **Run tests**: `npm test` to ensure everything works
3. **Start development**: `npm run test:watch` for continuous testing
4. **Check coverage**: `npm run test:coverage` to verify test coverage
5. **Build**: `npm run build` to compile the plugin

## 📄 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## 🙏 Acknowledgments

- Built for the [Obsidian](https://obsidian.md) community
- Inspired by the need for better people and company management in personal knowledge bases
