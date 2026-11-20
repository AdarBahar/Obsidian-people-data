# Metadata format

This page describes the files that hold your people metadata. It gives the full rules, the template and the edge cases. The root [README](../README.md) gives a short overview.

The plugin does not keep hidden metadata files. Every entry is a normal Markdown note in your vault, in the People folder. You can edit these notes by hand. If you do, follow the rules on this page.

## File types

There are two file types: `consolidated` and `atomic`. Set the type in the `def-type` property of each file.

- `def-type: consolidated` puts many people from one company in one file.
- `def-type: atomic` puts one person in one file.

If a file has no `def-type` property, the plugin uses the **Default people file type** setting. The default value is `consolidated`. Always set `def-type` in new files. The default can change in a later release. The commands and the auto-registration add the property for you.

## Consolidated files

A consolidated file holds many people from the same company. Use this rule set for each file:

1. The **file name** is the **company name**. For example, `TechCorp.md` is the company TechCorp.
2. The **frontmatter** can set a company color with the `color` property. Use a color name (`color: "blue"`) or a hex code (`color: "#0066cc"`). The color marks the double underline of every person in the company.
3. The **first line** after the frontmatter can hold a company logo. Use `![Company Logo](logo.png)` or `![[logo.png]]`. The line must contain only the image. If the image does not load, the plugin shows a default logo with the first two letters of the company name. See [Logo fallback](#logo-fallback).
4. A person block has four parts: a **full name**, a **job position**, a **department** and **notes**. They must appear **in that order**.
5. The full name uses the line `# <name>`. Obsidian renders it as a heading. A `# <name>` line always starts a new person. This is true even when the divider before it is missing. Inside notes, use `##` or smaller headings.
6. The job position uses a line that starts with `Position: `.
7. The department uses a line that starts with `Department: `.
8. Any other line after the full name is part of the notes. The notes can span several lines. They end at the next divider or the next full name. You can use Markdown in the notes.
9. A line with only three hyphens (`---`) is a divider between person blocks. In the settings, you can use three underscores (`___`) as the divider.

Example file, `TechCorp.md`:

```markdown
---
def-type: consolidated
color: "blue"
---

![TechCorp Logo](logo.png)

# John Doe
Position: Developer
Department: Engineering

Notes about John Doe.
These notes can span several lines.
They end when the divider is reached.

---

# Jane Smith
Position: Manager
Department: Management

The last entry in the file does not need a divider. A divider after it is also valid.
```

## Atomic files

An atomic file holds one person.

1. The **file name** is the full name of the person.
2. The **contents** of the file, without the frontmatter, are the metadata.

Use the frontmatter `def-type: atomic`.

## Auto-registration and templates

The plugin handles new files in the People folder in two cases. Turn this behavior off with **Settings → Auto-register new files** if you want manual control.

**When you create a new Markdown file in the People folder**, the plugin:

1. Adds the `def-type: consolidated` property.
2. Applies the "People" label in the file explorer.
3. Adds a basic template, if the file is empty.

**When you open an empty Markdown file in the People folder**, the plugin:

1. Detects that the file is empty and has no People metadata.
2. Adds the full template. It has the page properties (`def-type` and `color`), a logo placeholder, two example person entries, and the dividers between them.

The template looks like this:

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

## Add a person form

The **Add a person** command opens a form. The form has these fields:

1. **Full name** (required). For example, "John Smith".
2. **Job title** (optional). For example, "Dev Team Leader".
3. **Department** (optional). For example, "Engineering".
4. **Description** (required). Notes about the person.
5. **Choose company.** The dropdown lists all existing companies by name. Select one, or select "Create a new company".

If you select "Create a new company", the plugin creates a consolidated file. The file name is the last word of the full name, followed by `-Company`. For example, "Maya Lopez" creates `Lopez-Company.md`. The plugin adds the frontmatter and the template, and it adds a placeholder logo that uses the [logo fallback](#logo-fallback).

The form shows a notice if the full name, the description or the company is missing.

## Logo fallback

When a company logo does not load, the plugin shows a default logo. The default logo is a badge with the first two letters of the company name. For example, "TechCorp" shows "TC". If the plugin finds no company name, it shows "CO". The plugin detects a broken image and replaces it automatically. The badge has a title attribute, so screen readers can read it.

## Available color names

You can use a color name in place of a hex code:

- **Primary colors:** `blue`, `red`, `green`, `orange`, `purple`, `teal`
- **Secondary colors:** `navy`, `crimson`, `forest`, `amber`, `violet`, `cyan`
- **Muted colors:** `slate`, `rose`, `lime`, `indigo`, `pink`, `brown`
- **Custom colors:** `mint`, `coral`, `lavender`, `gold`, `silver`, `bronze`

[COMPANY_COLORS.md](COMPANY_COLORS.md) shows every color with a preview. The color property also accepts a hex code (`#0066cc`), a CSS color name, or an `rgb()` or `hsl()` value. Other values are ignored.

## Metadata context

A context limits the metadata that a note can use. A context is the same as a metadata file.

By default, a note has no context. It can use all the metadata in all your files. If you add a context, the note uses only the metadata in the files that you list.

To add a context, add a `def-context` property to the note. The property is a list of file paths:

```yaml
---
def-context:
  - metadata/people1.md
  - metadata/people2.md
---
```

You can edit the property in Obsidian's properties panel or in the source view of the frontmatter.

To remove one context, delete its path from the list. To remove all contexts, delete the `def-context` property.
