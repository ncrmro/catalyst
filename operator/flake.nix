{
  description = "Catalyst Operator development environment";

  inputs = {
    nixpkgs.url = "github:NixOS/nixpkgs/nixos-unstable";
    flake-utils.url = "github:numtide/flake-utils";
  };

  outputs = { self, nixpkgs, flake-utils }:
    flake-utils.lib.eachDefaultSystem (system:
      let
        pkgs = import nixpkgs { inherit system; };
      in
      {
        devShells.default = pkgs.mkShell {
          buildInputs = with pkgs; [
            go
            gopls
            gotools
            go-tools
            gcc
            
            # Kubernetes tools
            kubectl
            kubernetes-helm
            kustomize
            kind
            kubebuilder
          ];

          shellHook = ''
            echo "Welcome to the Catalyst Operator dev shell!"
            echo "Go version: $(go version)"
            echo "Kubectl version: $(kubectl version --client --output=yaml | grep gitVersion | awk '{print $2}')"
          '';
        };
      }
    );
}
