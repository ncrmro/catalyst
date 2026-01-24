# DeepWork Rules

Rules are automated guardrails that trigger when specific files change during
AI agent sessions. They help ensure documentation stays current, security reviews
happen, and team guidelines are followed.

## Getting Started

1. Copy an example file and rename it (remove the `.example` suffix):
   ```
   cp readme-documentation.md.example readme-documentation.md
   ```

2. Edit the file to match your project's patterns

3. The rule will automatically trigger when matching files change

## Rule Format

Rules use YAML frontmatter in markdown files:

```markdown
---
name: Rule Name
trigger: "pattern/**/*"
safety: "optional/pattern"
---
Instructions in markdown here.
```

## Detection Modes

- **trigger/safety**: Fire when trigger matches, unless safety also matches
- **set**: Bidirectional file correspondence (e.g., source + test)
- **pair**: Directional correspondence (e.g., API code -> docs)

## Documentation

See `doc/rules_syntax.md` in the DeepWork repository for full syntax documentation.

## Creating Rules Interactively

Use `/deepwork_rules.define` to create new rules with guidance.
