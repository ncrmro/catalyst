{
  description = "K3s MicroVM Flake";

  inputs = {
    nixpkgs.url = "github:nixos/nixpkgs/nixos-unstable";
    microvm.url = "github:astro/microvm.nix";
    microvm.inputs.nixpkgs.follows = "nixpkgs";
  };

  outputs = { self, nixpkgs, microvm }:
    let
      system = "x86_64-linux";
      
      k3s-vm = nixpkgs.lib.nixosSystem {
        inherit system;
        modules = [
          microvm.nixosModules.microvm
          ({ pkgs, ... }: {
            system.stateVersion = "24.05";
            networking.hostName = "k3s";
            microvm = {
              hypervisor = "qemu";
              mem = 4096;
              vcpu = 4;
              shares = [{
                tag = "code";
                source = "/home/ncrmro/code/ncrmro/catalyst";
                mountPoint = "/code";
                proto = "virtiofs";
              }];
              interfaces = [{
                type = "user";
                id = "vm-k3s";
                mac = "02:00:00:00:00:01";
              }];
              volumes = [{
                mountPoint = "/var";
                image = "./k3s-var.img";
                size = 40960;
              }];
              forwardPorts = [
                {
                  from = "host";
                  host.port = 6443;
                  guest.port = 6443;
                }
                {
                  from = "host";
                  host.port = 2222;
                  guest.port = 22;
                }
              ];
            };

            services.k3s = {
              enable = true;
              role = "server";
              extraFlags = "--disable traefik --tls-san 127.0.0.1";
            };

                        networking.firewall.allowedTCPPorts = [ 6443 ];
            
                                    users.users.nixos = {
                                      isNormalUser = true;
                                      extraGroups = [ "wheel" ];
                                      initialPassword = "nixos";
                                    };
                        
                                    services.getty.autologinUser = "nixos";
                        
                                    services.openssh.enable = true;                        
                                    systemd.services.k3s.postStart = ''
                                      until [ -f /etc/rancher/k3s/k3s.yaml ]; do sleep 1; done
                                      cp /etc/rancher/k3s/k3s.yaml /var/kubeconfig
                                      mkdir -p /home/nixos/.kube
                                      cp /etc/rancher/k3s/k3s.yaml /home/nixos/.kube/config
                                      chown -R nixos:users /home/nixos/.kube
                                      chmod 600 /home/nixos/.kube/config
                                    '';                      })
                    ];      };
    in {
      packages.${system} = {
        default = k3s-vm.config.microvm.declaredRunner;
        k3s = k3s-vm.config.microvm.declaredRunner;
      };
    };
}
