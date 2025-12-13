{
  description = "chronos";
  inputs = {
    nixpkgs.url = "github:NixOS/nixpkgs/nixos-unstable";
    flake-utils.url = "github:numtide/flake-utils";
  };
  outputs = { self, nixpkgs, flake-utils }:
    flake-utils.lib.eachDefaultSystem (system:
      let
        pkgs = import nixpkgs {
          inherit system;
          config.allowUnfree = true;
        };
      in {
        devShells.default = pkgs.mkShell {
          buildInputs = with pkgs; [ bun cacert ];

          shellHook = ''
            # Load .env variables
            VARS_TO_LOAD=(
              "CONTEXT7_API_KEY"
            )
            ENV_FILE=".env"

            if [ -f "$ENV_FILE" ]; then
                for var_name in "''${VARS_TO_LOAD[@]}"; do
                    match=$(grep "^$var_name=" "$ENV_FILE")
                    if [ -n "$match" ]; then
                        val="''${match#*=}"
                        val=$(echo "$val" | sed -e 's/^"//' -e 's/"$//' -e "s/^'//" -e "s/'$//")
                        export "$var_name"="$val"
                    fi
                done
            fi

            # SSL Certificate
            export SSL_CERT_FILE="${pkgs.cacert}/etc/ssl/certs/ca-bundle.crt"
          '';

        };
      });
}
