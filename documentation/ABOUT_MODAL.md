# About People Metadata Modal

## Overview

The "About People Metadata" feature provides users with comprehensive information about the plugin, including its objectives, creator, and complete feature list. This modal is accessible from the plugin settings page.

## How to Access

1. **Open Obsidian Settings**: Go to Settings (⚙️ icon)
2. **Navigate to Plugin Settings**: Go to Community Plugins → People Metadata
3. **Scroll to Bottom**: Find the "About" section at the bottom of the settings page
4. **Click "Show Info"**: Click the "Show Info" button to open the About modal

## Modal Content

### Plugin Header
- **Plugin Name**: Obsidian People Metadata
- **Description**: A powerful tool for managing and looking up people metadata within your notes

### Creator Information
- **Creator**: Adar Bahar
- **Message**: Built for the Obsidian community with ❤️

### Objectives
The modal displays the main objectives of the plugin:
- Augment names in your Obsidian pages with rich company and position details
- Create comprehensive company profiles with custom colors and logos
- Track mention counts and relationships across your entire vault
- Provide instant previews and smart tooltips for people information
- Optimize performance for large datasets with advanced search capabilities

### Core Features
A comprehensive list of the plugin's main features:
- 🏢 **Company Management** - Organize people by company with custom colors and logos
- 💬 **Smart Tooltips** - Hover over names to see rich person details with mention counts
- ➕ **Add Person Modal** - User-friendly interface for adding new people
- ⚡ **Name Auto-completion** - Intelligent name suggestions with trigger patterns
- 🔄 **Auto-Registration** - Automatically set up new files in the People folder
- 📊 **Mention Counting** - Track how many times people are mentioned across your vault
- 🎯 **Performance Optimization** - Optimized search engine for large datasets (1000+ people)
- 📥 **CSV Import** - Bulk import people data from CSV files
- 📱 **Mobile Support** - Works seamlessly on both desktop and mobile
- 🎨 **Color Coding** - Assign colors to companies for visual organization

### Advanced Features
Additional technical features:
- 🔍 **Smart Search** - Distinguish between task mentions and text mentions
- ⚡ **Performance Monitoring** - Real-time statistics and performance metrics
- 💾 **Memory Efficiency** - Advanced caching and compressed data structures
- 🎯 **Fuzzy Matching** - Find people even with typos or partial names
- 🔄 **Auto-Refresh** - Automatically update mention counts when files are modified
- 📈 **Scalability** - Handles large datasets without performance degradation

### Resources
Links to external resources:
- **📚 Documentation & Source Code** - Links to the GitHub repository
- **🐛 Report Issues & Feature Requests** - Links to the GitHub issues page

### Version Information
- **Plugin Version**: 1.1.0
- **License**: MIT

## Design Features

### Visual Design
- **Clean Layout**: Well-organized sections with clear headings
- **Optimal Sizing**: 1100px width, 95vh height to completely eliminate horizontal and vertical scrolling
- **Consistent Styling**: Follows Obsidian's design language
- **Responsive Design**: Adapts width based on screen size (98vw on mobile, 95vw on tablet, 1100px on desktop)
- **No Scrolling**: Optimized dimensions and word wrapping to fit all content without any scrolling
- **Color Coding**: Uses emojis and visual indicators for easy scanning
- **Improved Readability**: Enhanced line height (1.5) and comprehensive word wrapping
- **Content Protection**: All elements use proper box-sizing and overflow handling

### User Experience
- **Easy Access**: Simple button in settings to open the modal
- **Comprehensive Information**: All important plugin information in one place
- **External Links**: Direct links to documentation and support
- **Professional Presentation**: Clean, informative layout

### Technical Implementation
- **Modal Component**: Uses Obsidian's native Modal API
- **CSS Styling**: Custom styles that integrate with Obsidian's theme system
- **Responsive Layout**: Adapts to different screen sizes
- **Accessibility**: Proper heading structure and navigation

## Benefits

### For Users
- **Quick Reference**: Easy access to all plugin features and capabilities
- **Learning Tool**: Helps users discover features they might not know about
- **Support Access**: Direct links to documentation and issue reporting
- **Transparency**: Clear information about the plugin's creator and objectives

### For Support
- **Reduced Questions**: Users can find basic information without asking
- **Feature Discovery**: Helps users understand the full scope of the plugin
- **Version Tracking**: Clear version information for troubleshooting
- **Contact Information**: Easy access to support channels

## Usage Tips

### When to Use
- **First Time Setup**: Learn about all available features
- **Feature Discovery**: Discover advanced features you might have missed
- **Troubleshooting**: Check version information and access support links
- **Reference**: Quick reminder of what the plugin can do

### Best Practices
- **Regular Review**: Occasionally check for new features or updates
- **Share Information**: Use the modal to show others what the plugin can do
- **Report Issues**: Use the provided links to report bugs or request features
- **Stay Updated**: Check version information to ensure you have the latest features

## Future Enhancements

### Planned Improvements
- **Changelog Integration**: Show recent updates and new features
- **Usage Statistics**: Display personal usage statistics and insights
- **Quick Actions**: Direct access to common tasks from the modal
- **Tutorial Links**: Links to video tutorials or step-by-step guides

### Community Features
- **User Testimonials**: Showcase how others are using the plugin
- **Community Links**: Connect to user forums or discussion groups
- **Feature Voting**: Allow users to vote on future feature priorities
- **Success Stories**: Share examples of how the plugin helps users

## Technical Details

### Implementation
- **File**: `src/settings.ts` - `showAboutModal()` method
- **Styling**: `styles.css` - `.about-people-metadata-modal` classes
- **Modal API**: Uses Obsidian's native Modal component
- **Content Generation**: Dynamically creates content using DOM manipulation

### Customization
The modal content can be easily updated by modifying the arrays in the `showAboutModal()` method:
- `objectives` array for plugin objectives
- `features` array for core features
- `advancedFeatures` array for advanced capabilities

### Maintenance
- **Version Updates**: Update version information when releasing new versions
- **Feature Updates**: Add new features to the appropriate arrays
- **Link Updates**: Ensure external links remain valid and current
- **Content Review**: Regularly review content for accuracy and completeness
