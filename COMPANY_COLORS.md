# Company Color Palette

You can now use predefined color names instead of hex codes for company colors in your frontmatter!

## Usage

In your company definition file frontmatter, you can use either:

### Option 1: Color Names (Recommended)
```yaml
---
def-type: consolidated
color: "blue"
---
```

### Option 2: Hex Codes (Still Supported)
```yaml
---
def-type: consolidated
color: "#0066cc"
---
```

## Available Color Names

### Primary Colors
- **blue** → `#0066cc` 🔵
- **red** → `#e74c3c` 🔴
- **green** → `#27ae60` 🟢
- **orange** → `#f39c12` 🟠
- **purple** → `#9b59b6` 🟣
- **teal** → `#1abc9c` 🔷

### Secondary Colors
- **navy** → `#2c3e50` 🔹
- **crimson** → `#c0392b` ❤️
- **forest** → `#229954` 🌲
- **amber** → `#f1c40f` 🟡
- **violet** → `#8e44ad` 💜
- **cyan** → `#17a2b8` 🔵

### Muted Colors
- **slate** → `#607d8b` ⚫
- **rose** → `#e91e63` 🌹
- **lime** → `#8bc34a` 🟢
- **indigo** → `#3f51b5` 🔵
- **pink** → `#e91e63` 💗
- **brown** → `#795548` 🤎

### Custom Colors
- **mint** → `#b5e550` 🍃
- **coral** → `#ff6b35` 🪸
- **lavender** → `#b19cd9` 💜
- **gold** → `#ffd700` 🥇
- **silver** → `#c0c0c0` 🥈
- **bronze** → `#cd7f32` 🥉

## Examples

### Tech Company (Blue Theme)
```yaml
---
def-type: consolidated
color: "blue"
---
```

### Creative Agency (Coral Theme)
```yaml
---
def-type: consolidated
color: "coral"
---
```

### Financial Services (Navy Theme)
```yaml
---
def-type: consolidated
color: "navy"
---
```

### Startup (Mint Theme)
```yaml
---
def-type: consolidated
color: "mint"
---
```

## Benefits

✅ **Easier to remember** - Use "blue" instead of "#0066cc"  
✅ **Consistent colors** - Predefined palette ensures good visual design  
✅ **Still flexible** - Hex codes are still supported for custom colors  
✅ **Better UX** - Can be used with Obsidian's property dropdowns  

## Setting Up Property Dropdowns in Obsidian

To get a dropdown selection for colors in Obsidian:

1. Go to **Settings** → **Core plugins** → **Properties**
2. Find the `color` property in your vault
3. Set the property type to **List** or **Select**
4. Add the color names as options: `blue, red, green, orange, purple, teal, navy, crimson, forest, amber, violet, cyan, slate, rose, lime, indigo, pink, brown, mint, coral, lavender, gold, silver, bronze`

Now when you edit a company file, you'll get a nice dropdown to select colors!

## Using the Company Configuration Interface

The plugin also provides a visual interface for configuring company colors:

1. **Open Settings** → People Metadata → "Configure companies"
2. **Select colors** from the dropdown with emoji indicators
3. **See live preview** of color names and hex values
4. **Save changes** directly to company files

The interface shows colors like:
- 🔵 blue
- 🔴 red  
- 🟢 green
- 🟠 orange
- 🪸 coral
- 🍃 mint

This makes it easy to visually select and configure company colors without remembering hex codes!
