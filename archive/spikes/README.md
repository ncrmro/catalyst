# Spikes

This directory contains spike solutions - exploratory code to test concepts and ideas.

## Core Principles

Spikes should always attempt to explore the **simplest solution** to a well-defined problem. The goal is to quickly test concepts without unnecessary complexity.

- Focus on solving a single, specific problem
- Prioritize simplicity and clarity over comprehensive feature sets
- Include documentation that clearly explains the approach and findings
- Example code should usually be in code blocks within README.md files
- Scripts that can be used to test or verify functionality can go in the spike folder

## Naming Convention

All spike directories should follow this naming pattern:

```
TIMESTAMP_SPIKE_NAME
```

Where:
- `TIMESTAMP` is a Unix timestamp (e.g., 1630000000)
- `SPIKE_NAME` is a descriptive name for the spike, using underscores for spaces

Example:
```
1630000000_auth_system_exploration
```

This convention helps keep spikes organized chronologically and makes it clear that they are experimental solutions.