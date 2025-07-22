# Obsidian Plugin Compliance Rules

## 🎯 **Purpose**
This document ensures the People Metadata plugin remains compliant with Obsidian's guidelines and best practices during ongoing development.

---

## 🏗️ **Architecture & Code Quality Rules**

### **1. NO Global Variables**
❌ **NEVER DO:**
```typescript
window.myPlugin = something;
(window as any).globalVar = value;
```

✅ **ALWAYS DO:**
```typescript
// Use PluginContext for state management
const context = PluginContext.getInstance();
// Or pass dependencies through constructors
```

### **2. Promise Handling**
❌ **NEVER DO:**
```typescript
someAsyncFunction()
  .then(result => { /* ... */ })
  .catch(error => { /* ... */ });
```

✅ **ALWAYS DO:**
```typescript
try {
  const result = await someAsyncFunction();
  // handle result
} catch (error) {
  // handle error
}
```

### **3. Element Creation**
❌ **NEVER DO:**
```typescript
const div = document.createElement('div');
document.body.appendChild(div);
```

✅ **ALWAYS DO:**
```typescript
const div = containerEl.createDiv({ cls: 'my-class' });
// Or use specific methods
const heading = containerEl.createEl('h2', { text: 'Title' });
```

### **4. File Operations**
❌ **NEVER DO:**
```typescript
await this.app.vault.modify(file, content); // For background operations
```

✅ **ALWAYS DO:**
```typescript
await this.app.vault.process(file, () => content); // For background
await this.app.vault.modify(file, content); // Only for user-initiated changes
```

### **5. Frontmatter Parsing**
❌ **NEVER DO:**
```typescript
const frontmatterRegex = /^---\n(.*?)\n---/s;
const match = content.match(frontmatterRegex);
```

✅ **ALWAYS DO:**
```typescript
const fileMetadata = this.app.metadataCache.getFileCache(file);
const fmPos = fileMetadata?.frontmatterPosition;
if (fmPos) {
  const contentWithoutFM = content.slice(fmPos.end.offset + 1);
}
```

---

## 🎨 **UI & HTML Standards**

### **6. Unique IDs Only**
❌ **NEVER DO:**
```typescript
// Creating multiple elements with same ID
elements.forEach(el => {
  el.createDiv({ attr: { id: 'same-id' } }); // WRONG!
});
```

✅ **ALWAYS DO:**
```typescript
// Use data attributes and CSS classes
elements.forEach(el => {
  el.createDiv({ 
    cls: 'my-plugin-element',
    attr: { 'data-my-plugin': 'true' }
  });
});
```

### **7. Proper Heading Creation**
❌ **NEVER DO:**
```typescript
const div = containerEl.createDiv();
div.setHeading(2); // This method doesn't exist
```

✅ **ALWAYS DO:**
```typescript
const heading = containerEl.createEl('h2', { 
  cls: 'my-heading-class',
  text: 'Heading Text'
});
```

---

## 📁 **File & Manifest Standards**

### **8. Manifest.json Requirements**
✅ **MUST HAVE:**
```json
{
  "id": "people-metadata",
  "name": "People Metadata",
  "version": "X.Y.Z",
  "minAppVersion": "1.5.12",
  "description": "Under 250 chars, ends with period.",
  "author": "Your Name",
  "authorUrl": "https://github.com/username",
  "isDesktopOnly": false
}
```

### **9. Description Rules**
- ✅ Maximum 250 characters
- ✅ Must end with a period
- ✅ No emoji or special characters
- ✅ Clear and descriptive
- ✅ Follow Obsidian style guide

### **10. Version Management**
✅ **ALWAYS:**
- Use semantic versioning (X.Y.Z)
- Update `manifest.json` version before release
- Update `versions.json` with compatibility info
- Create git tags for releases

---

## 🔧 **Development Practices**

### **11. Error Handling**
✅ **ALWAYS:**
```typescript
try {
  await riskyOperation();
} catch (error) {
  console.error('Plugin error:', error);
  new Notice('Operation failed. Please try again.');
}
```

### **12. Memory Management**
✅ **ALWAYS:**
```typescript
onunload() {
  // Clean up event listeners
  // Remove DOM elements
  // Clear intervals/timeouts
  // Dispose of services
  PluginContext.cleanup();
}
```

### **13. Mobile Compatibility**
✅ **ALWAYS:**
- Test on mobile devices
- Use responsive design
- Handle touch events
- Consider screen size limitations
- Set `"isDesktopOnly": false` only if truly mobile-compatible

---

## 🧪 **Testing & Quality Assurance**

### **14. Before Every Commit**
✅ **CHECKLIST:**
- [ ] `npm run build` succeeds without errors
- [ ] No TypeScript compilation errors
- [ ] All functionality tested manually
- [ ] No console errors in dev tools
- [ ] Mobile compatibility verified (if applicable)

### **15. Before Every Release**
✅ **CHECKLIST:**
- [ ] Version number updated in `manifest.json`
- [ ] `versions.json` updated with compatibility
- [ ] README updated with new features
- [ ] All tests pass (if you have tests)
- [ ] Plugin works in clean Obsidian vault
- [ ] No breaking changes for existing users

---

## 📚 **Documentation Standards**

### **16. README Requirements**
✅ **MUST INCLUDE:**
- Clear description of plugin purpose
- Installation instructions
- Usage examples with screenshots
- Feature documentation
- Troubleshooting section
- Contributing guidelines

### **17. Code Comments**
✅ **ALWAYS:**
```typescript
/**
 * Handles person metadata preview display
 * @param person - The person metadata to display
 * @param coords - Screen coordinates for positioning
 */
public showPreview(person: PersonMetadata, coords: Coordinates): void {
  // Implementation
}
```

---

## 🚀 **Release Process**

### **18. GitHub Actions Setup**
✅ **REQUIRED FILES:**
- `.github/workflows/release.yml` (automated releases)
- Builds on tag push
- Includes `main.js`, `manifest.json`, `styles.css`

### **19. Release Checklist**
✅ **STEPS:**
1. Update version in `manifest.json`
2. Update `versions.json`
3. Commit changes
4. Create and push git tag: `git tag X.Y.Z && git push origin X.Y.Z`
5. GitHub Actions creates release automatically
6. Verify release includes all required files

---

## ⚠️ **Common Pitfalls to Avoid**

### **20. Performance Issues**
❌ **AVOID:**
- Synchronous file operations in UI thread
- Large DOM manipulations
- Memory leaks from uncleaned event listeners
- Blocking the main thread

### **21. Breaking Changes**
❌ **AVOID:**
- Changing plugin ID after release
- Removing features without deprecation notice
- Breaking existing user configurations
- Incompatible data format changes

### **22. Security Issues**
❌ **AVOID:**
- Executing user input as code
- Accessing files outside vault
- Making external network requests without user consent
- Storing sensitive data in plain text

---

## 📋 **Pre-Commit Checklist**

Before every commit, verify:
- [ ] No global variables used
- [ ] All promises use async/await
- [ ] Element creation uses Obsidian APIs
- [ ] No duplicate HTML IDs
- [ ] Proper error handling in place
- [ ] TypeScript compiles without errors
- [ ] Mobile compatibility maintained
- [ ] Memory cleanup implemented

---

## 🎯 **Compliance Verification**

**Monthly Review:**
- Review this document for new Obsidian guidelines
- Check for deprecated APIs in your code
- Verify all rules are still being followed
- Update rules based on Obsidian updates

**Before Major Releases:**
- Full compliance audit against this document
- Test on latest Obsidian version
- Verify mobile compatibility
- Check performance benchmarks

---

*This document should be updated whenever Obsidian releases new guidelines or best practices.*
