{ pkgs, inputs, ... }:

let
  # Workaround for playwright-mcp permission issue
  # See: https://github.com/NixOS/nixpkgs/issues/443704
  playwright-mcp-wrapped = pkgs.writeShellScriptBin "mcp-server-playwright" ''
    export PWMCP_PROFILES_DIR_FOR_TEST="$PWD/.playwright-mcp"
    exec ${pkgs.playwright-mcp}/bin/mcp-server-playwright "$@"
  '';
in {
  packages = with pkgs; [
    # Kubernetes / Docker
    kind
    kubectl
    k9s
    kubernetes-helm
    docker-client

    # Web
    bun
    nodejs_22
    postgresql

    # Operator (Go)
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
  ] ++ [
    inputs.llm-agents.packages.${pkgs.system}.claude-code
  ];

  env = {
    PLAYWRIGHT_BROWSERS_PATH = "${pkgs.playwright-driver.browsers}";
    PLAYWRIGHT_SKIP_VALIDATE_HOST_REQUIREMENTS = "true";
    LOCAL_PREVIEW_ROUTING = "true";
  };

  enterShell = ''
    # Inherit DOCKER_HOST from parent shell, or use default socket
    export DOCKER_HOST="''${DOCKER_HOST:-unix:///var/run/docker.sock}"

    # Safely extract ports from code/web/.env for display.
    WEB_PORT=$(grep '^WEB_PORT=' code/web/.env 2>/dev/null | cut -d= -f2- | tr -d '"' | tr -d "'" || echo "3000")
    DB_PORT=$(grep '^DB_PORT=' code/web/.env 2>/dev/null | cut -d= -f2- | tr -d '"' | tr -d "'" || echo "5432")
    DATABASE_URL="postgres://postgres:postgres@localhost:$DB_PORT/catalyst"

    echo "Catalyst devenv shell"
    echo "----------------------------------------"
    echo "  Web Port:     $WEB_PORT"
    echo "  DB Port:      $DB_PORT (Local Postgres)"
    echo "  Database URL: $DATABASE_URL"
    echo "  K3s Postgres: 5432 (NodePort 30432, if K3s running)"
    echo "----------------------------------------"
    echo "Run 'cd code && make up-local' for local dev or 'cd code && make up' for full K3s."
  '';
}
