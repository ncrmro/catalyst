{
  description = "Catalyst — open-source Astro site on Cloudflare Workers";

  inputs.nixpkgs.url = "github:NixOS/nixpkgs/nixos-unstable";

  outputs = { self, nixpkgs, ... }:
    let
      systems = [ "x86_64-linux" "aarch64-linux" "x86_64-darwin" "aarch64-darwin" ];
      forAllSystems = nixpkgs.lib.genAttrs systems;
    in {
      formatter = forAllSystems (system: nixpkgs.legacyPackages.${system}.nixfmt-rfc-style);

      devShells = forAllSystems (system:
        let pkgs = import nixpkgs { inherit system; config.allowUnfree = true; };
        in {
          default = pkgs.mkShell {
            name = "catalyst-shell";
            packages = with pkgs; [
              bun
              nodejs_22
              wrangler
              nixfmt-rfc-style
            ];
            shellHook = ''
              echo "Catalyst dev shell loaded."
              echo "  cd code/web && bun install && bun run dev"
            '';
          };
        });
    };
}
