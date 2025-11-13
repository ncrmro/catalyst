{
  description = "NixOS VM with Kind (Kubernetes in Docker) for local development";

  inputs = {
    nixpkgs.url = "github:NixOS/nixpkgs/nixos-unstable";
  };

  outputs = { self, nixpkgs }: {
    nixosConfigurations.kind-vm = nixpkgs.lib.nixosSystem {
      system = "x86_64-linux";
      modules = [
        ({ config, pkgs, lib, ... }: {
          # Basic system configuration
          system.stateVersion = "24.11";

          # Enable required kernel modules for containers and Kind
          boot.kernelModules = [ "br_netfilter" "overlay" ];
          boot.kernel.sysctl = {
            "net.bridge.bridge-nf-call-iptables" = 1;
            "net.bridge.bridge-nf-call-ip6tables" = 1;
            "net.ipv4.ip_forward" = 1;
          };

          # Networking configuration
          networking = {
            hostName = "kind-vm";
            firewall = {
              enable = true;
              # Allow common Kubernetes ports
              allowedTCPPorts = [
                22    # SSH
                6443  # Kubernetes API server
                80    # HTTP
                443   # HTTPS
              ];
              allowedTCPPortRanges = [
                { from = 30000; to = 32767; } # NodePort range
              ];
              trustedInterfaces = [ "docker0" "br-+" "kind" ];
            };
          };

          # Enable Docker daemon
          virtualisation.docker = {
            enable = true;
            enableOnBoot = true;
            autoPrune = {
              enable = true;
              dates = "weekly";
            };
            daemon.settings = {
              # Docker settings optimized for Kind
              log-driver = "json-file";
              log-opts = {
                max-size = "10m";
                max-file = "3";
              };
              storage-driver = "overlay2";
            };
          };

          # User configuration
          users.users.nixos = {
            isNormalUser = true;
            description = "NixOS User";
            extraGroups = [ "wheel" "docker" ];
            # Known password for local VM access (safe on local development VM)
            initialPassword = "test";
          };

          # Enable passwordless sudo for wheel group
          security.sudo.wheelNeedsPassword = false;

          # System packages
          environment.systemPackages = with pkgs; [
            # Kubernetes and container tools
            kind
            kubectl
            docker
            docker-compose

            # Networking and debugging tools
            curl
            wget
            htop
            vim
            git
            jq
            expect

            # Additional useful tools
            kubernetes-helm
            k9s
          ];

          # Enable SSH for remote access
          services.openssh = {
            enable = true;
            settings = {
              PermitRootLogin = "no";
              PasswordAuthentication = true;
              # Allow empty passwords for passwordless login (safe on local VM)
              PermitEmptyPasswords = "yes";
              # Allow authentication with empty password
              PubkeyAuthentication = "yes";
            };
          };

          # Systemd service to create Kind cluster on boot
          systemd.services.kind-cluster = {
            description = "Create Kind Kubernetes cluster";
            after = [ "docker.service" "network-online.target" ];
            wants = [ "network-online.target" ];
            wantedBy = [ "multi-user.target" ];

            serviceConfig = {
              Type = "oneshot";
              User = "nixos";
              RemainAfterExit = true;
              ExecStartPre = "${pkgs.bash}/bin/bash -c '${pkgs.docker}/bin/docker info || sleep 5'";
              ExecStart = pkgs.writeShellScript "kind-cluster-init" ''
                set -e
                export PATH="${pkgs.kind}/bin:${pkgs.docker}/bin:$PATH"

                # Check if cluster already exists
                if ! kind get clusters 2>/dev/null | grep -q "^kind$"; then
                  echo "Creating Kind cluster..."
                  kind create cluster --config ${pkgs.writeText "kind-config.yaml" ''
                    kind: Cluster
                    apiVersion: kind.x-k8s.io/v1alpha4
                    name: kind
                    nodes:
                    - role: control-plane
                      extraPortMappings:
                      - containerPort: 80
                        hostPort: 80
                        protocol: TCP
                      - containerPort: 443
                        hostPort: 443
                        protocol: TCP
                      - containerPort: 30000
                        hostPort: 30000
                        protocol: TCP
                    networking:
                      apiServerAddress: "0.0.0.0"
                      apiServerPort: 6443
                  ''}

                  echo "Kind cluster created successfully!"

                  # Set up kubectl context
                  mkdir -p /home/nixos/.kube
                  kind get kubeconfig --name kind > /home/nixos/.kube/config
                  chown -R nixos:users /home/nixos/.kube
                else
                  echo "Kind cluster already exists"
                fi
              '';
            };
          };

          # VM-specific settings using vmVariant (the KEY FIX!)
          # These settings ONLY apply when building with build-vm
          virtualisation.vmVariant = {
            virtualisation = {
              # Memory and disk size
              memorySize = 4096;  # 4GB RAM
              cores = 2;          # 2 CPU cores
              diskSize = 20480;   # 20GB disk

              # Headless mode - no graphics window
              graphics = false;

              # Port forwarding from host to VM
              # Ports are configurable via environment variables (see .env)
              # Note: Use NIX_BUILD_KIND_SSH_PORT etc. when building (see Makefile)
              forwardPorts = let
                # Helper to parse port with fallback
                parsePort = envVar: default:
                  let envVal = builtins.getEnv envVar;
                  in if envVal != "" then lib.toInt envVal else default;
              in [
                { from = "host"; host.port = parsePort "NIX_BUILD_KIND_SSH_PORT" 2222; guest.port = 22; }     # SSH
                { from = "host"; host.port = parsePort "NIX_BUILD_KIND_K8S_PORT" 6443; guest.port = 6443; }   # K8s API
                { from = "host"; host.port = parsePort "NIX_BUILD_KIND_HTTP_PORT" 8080; guest.port = 80; }   # HTTP
                { from = "host"; host.port = parsePort "NIX_BUILD_KIND_HTTPS_PORT" 8443; guest.port = 443; }  # HTTPS
                { from = "host"; host.port = parsePort "NIX_BUILD_KIND_NODEPORT_PORT" 30000; guest.port = 30000; } # NodePort
              ];
            };
          };
        })
      ];
    };

    # Convenience packages for building and running the VM
    packages.x86_64-linux = {
      # Build the VM
      vm = self.nixosConfigurations.kind-vm.config.system.build.vm;

      # Build a QCOW2 image (for permanent VMs)
      qcow2 = self.nixosConfigurations.kind-vm.config.system.build.vmWithBootLoader;
    };

    # Development shell with tools for managing the VM
    devShells.x86_64-linux.default = nixpkgs.legacyPackages.x86_64-linux.mkShell {
      buildInputs = with nixpkgs.legacyPackages.x86_64-linux; [
        qemu
        kind
        kubectl
        kubernetes-helm
      ];

      shellHook = ''
        echo "Kind VM Development Environment"
        echo "=============================="
        echo ""
        echo "Build and run commands:"
        echo "  nixos-rebuild build-vm --flake .#kind-vm"
        echo "  ./result/bin/run-kind-vm-vm"
        echo ""
        echo "Or use nix commands:"
        echo "  nix build .#vm"
        echo "  nix run .#vm"
        echo ""
        echo "After VM starts:"
        echo "  - SSH: ssh nixos@localhost -p 2222 (password: nixos)"
        echo "  - K8s API: https://localhost:6443"
        echo "  - HTTP: http://localhost:8080"
        echo "  - HTTPS: https://localhost:8443"
        echo ""
        echo "Inside the VM:"
        echo "  - Kind cluster auto-creates on boot"
        echo "  - kubectl is pre-configured"
        echo "  - Run: kubectl get nodes"
      '';
    };

    # Make the VM directly runnable
    apps.x86_64-linux = {
      vm = {
        type = "app";
        program = "${self.packages.x86_64-linux.vm}/bin/run-kind-vm-vm";
      };

      default = self.apps.x86_64-linux.vm;
    };
  };
}
