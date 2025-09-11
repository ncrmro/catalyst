# Local Project Report Generation Spike

.PHONY: fetch generate report clean reset help

# Default target
help:
	@echo "Available targets:"
	@echo "  fetch    - Fetch real GitHub pull requests using PAT and populate projects.yml"
	@echo "  generate - Generate AI-powered project reports from populated data"
	@echo "  report   - Run fetch and generate in sequence"
	@echo "  clean    - Remove generated files"
	@echo "  reset    - Reset projects.yml to clean template"
	@echo "  help     - Show this help message"

# Fetch real GitHub pull requests
fetch:
	@echo "Fetching GitHub data..."
	cd ../.. && npx tsx spikes/1757518328_local_project_report_generation/fetch-github-data.ts

# Generate project reports
generate:
	@echo "Generating project reports..."
	cd ../.. && npx tsx spikes/1757518328_local_project_report_generation/generate-report.ts

# Run both fetch and generate
report: fetch generate
	@echo "Project report generation complete!"

# Clean generated files
clean:
	@echo "Cleaning generated files..."
	rm -f *-report.md
	@echo "Cleaning complete!"

# Reset projects.yml to template
reset:
	@echo "Resetting projects configuration..."
	cp projects.template.yml projects.yml
	@echo "Reset complete! projects.yml has been restored to clean template."