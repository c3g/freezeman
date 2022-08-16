
{
  inputs = {
    nixpkgs.url = "github:NixOS/nixpkgs/nixos-23.11";
    utils.url = "github:numtide/flake-utils";
    flake-compat = {
      url = "github:edolstra/flake-compat";
      flake = false;
    };
  };

  outputs = { self, nixpkgs, utils, ... }:
    utils.lib.eachDefaultSystem (system:
      let
        pkgs = import nixpkgs { inherit system; };
      in
      {
        # defaultPackage = naersk-lib.buildPackage ./.;

        # defaultApp = utils.lib.mkApp {
        #   drv = self.defaultPackage."${system}";
        # };

        devShell = with pkgs; mkShell {
          buildInputs = [
	    pkgs.bashInteractive
            stdenv.cc.cc.lib # c library
            nodejs_18 nodePackages.npm nodePackages.pyright nodePackages.typescript-language-server nodePackages.vscode-langservers-extracted # node
            (python311.withPackages (p: with p; [ pip virtualenv ])) libffi # python
            postgresql
            openssl
          ];

          shellHook = ''
            export LD_LIBRARY_PATH=${pkgs.stdenv.cc.cc.lib}/lib
          '';
        };
      });
}
