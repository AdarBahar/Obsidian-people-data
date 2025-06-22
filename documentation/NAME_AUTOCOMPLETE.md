# Name Auto-completion Feature

The Name Auto-completion feature provides intelligent suggestions for people names from your metadata database when you type a specific trigger pattern.

## Overview

This feature allows you to quickly insert people names into your notes by typing a trigger pattern (default: `@name:`) followed by the beginning of a person's name. The system will show suggestions with rich information including company, position, and mention counts.

## How to Use

### Basic Usage

1. Type the trigger pattern: `@name:`
2. Start typing a person's name (or leave empty to see popular people)
3. Select from the suggestions using arrow keys or mouse
4. Press Enter or click to insert the full name

### Example

```
@name:John
```

This will show suggestions for people whose names start with "John", displaying:
- Full name
- Company name
- Position/title
- Number of mentions across your vault

### Empty Query

If you type just the trigger (`@name:`) without any text, the system will show:
- People with the most mentions in your vault
- Recently accessed people
- Alphabetically sorted fallback

## Settings

### Enable/Disable Feature

Go to **Settings > People Metadata > Name Auto-completion** and toggle "Enable name auto-completion".

### Custom Trigger Pattern

You can customize the trigger pattern in settings. Examples:
- `@name:` (default)
- `@@`
- `#person:`
- `::name::`

### Performance

The feature leverages the optimized search engine for fast suggestions, even with large datasets (1000+ people).

## Commands

### Insert Name Autocomplete Trigger

Use the command palette (Ctrl/Cmd + P) and search for "Insert name autocomplete trigger" to quickly insert the trigger pattern at your cursor position.

## Technical Details

### Integration with Existing Features

- **Optimized Search**: Uses the existing optimized search engine for fast prefix matching
- **Company Colors**: Suggestions show company color indicators when available
- **Mention Counts**: Displays how many times each person is mentioned across your vault
- **Performance**: Cached results and efficient indexing for large datasets

### Suggestion Display

Each suggestion shows:
1. **Primary**: Person's full name (bold)
2. **Secondary**: Company name and position (muted)
3. **Tertiary**: Mention count (if available, right-aligned)
4. **Visual**: Company color indicator (left border)

### Fallback Behavior

- If optimized search is disabled, falls back to basic string matching
- If no matches found, returns empty suggestions
- If query is too long (>50 characters), ignores the trigger

## Troubleshooting

### Autocomplete Not Working

1. Check that the feature is enabled in settings
2. Verify you're typing the correct trigger pattern
3. Ensure you have people data loaded in your vault
4. Try refreshing people data with the "Refresh people" command

### Performance Issues

1. Enable optimized search in settings for better performance
2. Use the "Rebuild optimized search indexes" command if needed
3. Consider reducing the number of people if you have a very large dataset

### Custom Trigger Not Working

1. Make sure you saved the settings after changing the trigger
2. The trigger pattern is case-sensitive
3. Avoid using common text patterns that might trigger accidentally

## Best Practices

1. **Choose a Unique Trigger**: Use a pattern that won't accidentally trigger during normal typing
2. **Keep Queries Short**: The system works best with short, specific queries
3. **Use Mention Counts**: Popular people (with high mention counts) appear first in empty queries
4. **Leverage Company Info**: Use company names in your search to narrow down results

## Integration with Workflows

### Note Taking
- Quickly reference people during meeting notes
- Add attendees to project documentation
- Link people to tasks and action items

### Project Management
- Assign people to tasks using autocomplete
- Reference team members in project updates
- Track stakeholder involvement

### Knowledge Management
- Build connections between people and topics
- Create comprehensive people networks
- Maintain accurate contact information

## Future Enhancements

Planned improvements include:
- Fuzzy matching for typo tolerance
- Recent people suggestions
- Context-aware suggestions based on current note
- Integration with external contact systems
