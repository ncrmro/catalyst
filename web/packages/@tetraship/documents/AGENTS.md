# @tetrastack/documents Context

This package defines the core domain logic for "Documents" - structured content units within the system.

## Key Concepts

- **Document**: An instance of content (e.g., a specific "Lean Canvas").
- **Document Type**: Definition of the schema and behavior for a class of documents.
- **Dependency**: Rules stating that Type A requires Type B to exist (e.g., "Persona" requires "Lean Canvas").

## Architecture

- **Schema Factories**: The schemas are exported as factories (`createDocumentsSchema`) to allow injecting foreign key references (like `users` and `projects`) without hard-coding dependencies on the host application's schema.
- **Dialects**: Support for both `sqlite` and `postgres` via separate entry points.

## Usage Patterns

When working with documents:

1.  Always use the schema returned by the factory in the host app.
2.  Use `content` field for JSON data, validated by the `schema` field in `document_types`.
3.  Respect `document_type_dependencies` when generating content flows.
