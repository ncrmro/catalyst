# Environments Specification

## Why

Environments provide isolated and pre-configured settings for users to interact with their code. This is crucial for streamlining development, facilitating robust testing, and enabling previews of changes before they are deployed to production. This approach significantly enhances development efficiency and ensures system stability.

## What

Environments, in this context, refer to various specialized contexts for code interaction. Each environment operates within its own dedicated Kubernetes namespace, ensuring strong resource and networking isolation. Containers running within these environments are authorized to perform actions specific to their namespace, with Kubernetes enforcing all necessary resource and networking constraints.

The types of environments include:

*   **Preview Environments:** Designed for showcasing and validating changes in a production-like setting, enabling early feedback and comprehensive review.
*   **Pull-Request/Branch Environments:** Tailored for testing specific code branches or pull requests, allowing developers to isolate and verify new features or fixes without affecting other development streams.
*   **Dev Containers:** Standardized development environments that provide a consistent and reproducible setup for developers, minimizing "it works on my machine" issues.
*   **Agent Environments:** Dedicated environments for automated agents to execute tasks, such as continuous integration/continuous deployment (CI/CD) pipelines or other automated workflows.

## How

Users will interact with and manage these environments through two primary interfaces, both offering a consistent set of functionalities:

*   **CLI/TUI (Command Line Interface/Text User Interface):** This interface will provide OpenID Connect (OIDC) authentication for `kubectl` and `k9s`, allowing users secure access to their Kubernetes resources. It will also enable users to view and manage their environments based on their assigned cluster roles and permissions.
*   **Web Interface:** A comprehensive web-based user interface will mirror all functionalities available in the CLI/TUI. This ensures that users can access and manage their environments with ease, regardless of their preferred interaction method.