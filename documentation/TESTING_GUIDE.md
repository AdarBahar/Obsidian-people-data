# Testing Guide: Name Recognition and Optimization

This guide helps you test the name recognition system and verify that the optimization features are working correctly.

## Quick Test Steps

### 1. **Basic Setup Test**

1. **Open your test vault** in Obsidian
2. **Enable the plugin**:
   - Go to Settings → Community Plugins
   - Find "People Metadata" and enable it
3. **Check plugin status**:
   - Open Command Palette (Cmd/Ctrl+P)
   - Type "Show search performance statistics"
   - Run the command to see if the plugin is loaded

### 2. **Create Test People**

Create a new note in your People folder (default: `People/Test Person.md`):

```markdown
---
def-type: people
---

# John Doe
Company: Acme Corp
Position: Software Engineer
Department: Engineering

John is a software engineer working on exciting projects.

---

# Jane Smith  
Company: Tech Solutions
Position: Product Manager
Department: Product

Jane leads the product development team.

---

# Bob Johnson
Company: Acme Corp
Position: Designer
Department: Design

Bob creates amazing user interfaces.
```

### 3. **Test Name Recognition**

Create a test note (e.g., `Test Recognition.md`) with content like:

```markdown
# Meeting Notes

Today I met with John Doe to discuss the project. Jane Smith also joined the call to provide product insights. Bob Johnson will help with the design mockups.

## Action Items
- [ ] Follow up with John Doe about technical requirements
- [x] Send design brief to Bob Johnson  
- [ ] Schedule review meeting with Jane Smith

The team (John Doe, Jane Smith, Bob Johnson) is working well together.
```

### 4. **Verify Name Marking**

After creating the test content:

1. **Check for underlined names**: Names should appear underlined in the editor
2. **Test tooltips**: Hover over underlined names to see person information
3. **Check mention counts**: Tooltips should show mention counts (e.g., "📝 3 mentions")

### 5. **Test Commands**

Try these commands from the Command Palette:

- **"Refresh people"**: Reloads all people data
- **"Refresh mention counts"**: Updates mention statistics
- **"Show search performance statistics"**: Shows performance metrics
- **"Toggle optimized search"**: Switches between legacy and optimized search

## Troubleshooting

### ❌ **Names Not Being Recognized**

**Possible causes:**
1. **People folder not set correctly**
   - Check Settings → People Metadata → People folder path
   - Default should be "People"

2. **People files not properly formatted**
   - Ensure files have `def-type: people` in frontmatter
   - Check that names are in `# Name` format

3. **Plugin not fully loaded**
   - Try disabling and re-enabling the plugin
   - Use "Refresh people" command

**Debug steps:**
1. Open Developer Console (Cmd/Ctrl+Shift+I)
2. Look for error messages
3. Try "Refresh people" command
4. Check if prefix tree is built: run "Show search performance statistics"

### ❌ **No Tooltips Appearing**

**Possible causes:**
1. **Popover settings**
   - Check Settings → People Metadata → Popover settings
   - Ensure popover is enabled

2. **Reading view vs Edit view**
   - Try switching between Reading and Edit modes
   - Check "Enable in reading view" setting

### ❌ **Performance Issues**

**Solutions:**
1. **Disable auto-refresh mention counts**
   - Settings → People Metadata → Auto-refresh mention counts → Off

2. **Use optimized search**
   - Settings → People Metadata → Use optimized search → On
   - Run "Rebuild optimized search indexes"

## Performance Testing

### **Test with Large Dataset**

1. **Create many people** (100+ entries)
2. **Enable optimized search**
3. **Run performance statistics**
4. **Compare legacy vs optimized performance**

### **Expected Performance Metrics**

**Legacy Search:**
- Works well for <100 people
- May slow down with 500+ people
- No caching

**Optimized Search:**
- Handles 1000+ people efficiently
- 95%+ cache hit rates
- Sub-millisecond scan times
- 70% memory reduction

## Advanced Testing

### **Test Optimization Features**

1. **Enable optimized search**:
   ```
   Settings → People Metadata → Use optimized search → On
   ```

2. **Rebuild indexes**:
   ```
   Command Palette → "Rebuild optimized search indexes"
   ```

3. **Check performance**:
   ```
   Command Palette → "Show search performance statistics"
   ```

4. **Expected results**:
   - Cache hit rate: >90%
   - Average scan time: <1ms
   - Memory usage: Reduced compared to legacy

### **Test Mention Counting**

1. **Create content with people mentions**
2. **Run "Refresh mention counts"**
3. **Hover over names to see counts**
4. **Expected format**: "📝 5 mentions (✅ 2 tasks, 💬 3 text)"

### **Test Auto-Refresh**

1. **Enable auto-refresh mention counts**
2. **Edit a file with people mentions**
3. **Wait 2-3 seconds after editing**
4. **Check if mention counts update automatically**

## Success Criteria

✅ **Basic Functionality**
- Names are underlined in editor
- Tooltips show person information
- Mention counts are displayed
- Commands work correctly

✅ **Performance**
- No noticeable lag when typing
- Fast tooltip display
- Efficient memory usage

✅ **Optimization**
- Optimized search can be enabled/disabled
- Performance statistics show improvements
- Large datasets (500+ people) work smoothly

## Common Issues and Solutions

| Issue | Solution |
|-------|----------|
| Names not recognized | Check People folder path, file format, run "Refresh people" |
| No tooltips | Check popover settings, try different view modes |
| Slow performance | Enable optimized search, disable auto-refresh if needed |
| Missing mention counts | Run "Refresh mention counts" command |
| Plugin not loading | Check console for errors, restart Obsidian |

## Getting Help

If you encounter issues:

1. **Check the console** for error messages
2. **Try the troubleshooting steps** above
3. **Run performance statistics** to see system status
4. **Disable optimized search** if experiencing issues
5. **Report issues** with console logs and steps to reproduce

The optimization system is designed to be backward compatible, so disabling optimized search should always work as a fallback.
