{
  description = "kind dev shell";

  inputs.nixpkgs.url = "github:NixOS/nixpkgs/nixos-unstable";

  outputs = { self, nixpkgs }:
  let
    system = "x86_64-linux";
    pkgs = import nixpkgs { inherit system; };
  in {
    devShells.${system}.default = pkgs.mkShell {
      packages = with pkgs; [
        kind
        kubectl
        k9s
        helm
        docker-client
      ];

      shellHook = ''
        # Inherit DOCKER_HOST from parent shell, or use default socket
        export DOCKER_HOST="''${DOCKER_HOST:-unix:///var/run/docker.sock}"

        # DOCUMENTATION: Turbopack Compatibility
        # Next.js (Turbopack) may panic if it encounters the .direnv directory due to unresolved symlinks.
        # Ensure 'web/.direnv/' is added to 'web/.gitignore' to prevent this.
        # See report-devshell-rust-error.md for full details.
      '';
    };
  };
}
