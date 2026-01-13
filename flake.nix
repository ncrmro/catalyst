{
  description = "Catalyst Development Environment";

  inputs = { nixpkgs.url = "github:NixOS/nixpkgs/nixos-unstable"; };

  outputs = { self, nixpkgs, ... }:
    let
      systems =
        [ "x86_64-linux" "aarch64-linux" "x86_64-darwin" "aarch64-darwin" ];
      forAllSystems = nixpkgs.lib.genAttrs systems;
    in {
      formatter = forAllSystems
        (system: nixpkgs.legacyPackages.${system}.nixfmt-rfc-style);

      devShells = forAllSystems (system:
        let
          pkgs = import nixpkgs {
            inherit system;
            config.allowUnfree = true;
          };

          # Workaround for playwright-mcp permission issue
          # See: https://github.com/NixOS/nixpkgs/issues/443704
          playwright-mcp-wrapped =
            pkgs.writeShellScriptBin "mcp-server-playwright" ''
              export PWMCP_PROFILES_DIR_FOR_TEST="$PWD/.playwright-mcp"
              exec ${pkgs.playwright-mcp}/bin/mcp-server-playwright "$@"
            '';
        in {
          default = pkgs.mkShell {
            name = "catalyst-shell";

            packages = with pkgs; [
              # Kubernetes / Docker
              kind
              kubectl
              k9s
              kubernetes-helm
              docker-client

              # Web
              nodejs_22
              postgresql

              # Operator
              go
              gopls
              gotools
              go-tools
              gcc
              kustomize
              kubebuilder

              # Testing
              playwright-driver.browsers
              playwright-mcp-wrapped

              # CLI Agents
              claude-code
              gemini-cli

              # Process Orchestration
              process-compose
            ];

            shellHook = ''
              # Inherit DOCKER_HOST from parent shell, or use default socket
              export DOCKER_HOST="''${DOCKER_HOST:-unix:///var/run/docker.sock}"

              # Playwright Setup
              export PLAYWRIGHT_BROWSERS_PATH=${pkgs.playwright-driver.browsers}
              export PLAYWRIGHT_SKIP_VALIDATE_HOST_REQUIREMENTS=true

              # Enable local preview routing (localhost URLs) for Operator and Web
              export LOCAL_PREVIEW_ROUTING=true

              # DOCUMENTATION: Turbopack Compatibility
              # Next.js (Turbopack) may panic if it encounters the .direnv directory due to unresolved symlinks.
              # Ensure 'web/.direnv/' is added to 'web/.gitignore' to prevent this.
              # See report-devshell-rust-error.md for full details.

              # Safely extract ports from web/.env for display (avoiding sourcing full file)
              WEB_PORT=$(grep '^WEB_PORT=' web/.env 2>/dev/null | cut -d= -f2- | tr -d '"' | tr -d "'" || echo "3000")
              DB_PORT=$(grep '^DB_PORT=' web/.env 2>/dev/null | cut -d= -f2- | tr -d '"' | tr -d "'" || echo "5432")
              DATABASE_URL="postgres://postgres:postgres@localhost:$DB_PORT/catalyst"

              echo "🚀 Catalyst Development Shell Loaded"
              echo "----------------------------------------"
              echo "  Web Port:     $WEB_PORT"
              echo "  DB Port:      $DB_PORT (K3s VM)"
              echo "  Database URL: $DATABASE_URL"
              echo "----------------------------------------"
              echo "Run 'make up' in web/ to start services."
            '';
          };
        });
    };
}
