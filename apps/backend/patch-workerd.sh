#!/usr/bin/env bash
# Patch workerd binary to work on NixOS

WORKERD_PATH=$(find ../../node_modules -path "*/@cloudflare/workerd-linux-64/bin/workerd" 2>/dev/null | head -1)

if [ -z "$WORKERD_PATH" ]; then
  echo "workerd binary not found - run 'bun install' first"
  exit 0
fi

if [ ! -f "$WORKERD_PATH" ]; then
  echo "workerd binary not found at $WORKERD_PATH"
  exit 0
fi

echo "Patching workerd at: $WORKERD_PATH"

# Get the Nix dynamic linker path
NIX_LINKER=$(nix eval --raw nixpkgs#stdenv.cc.bintools.dynamicLinker 2>/dev/null)

if [ -z "$NIX_LINKER" ]; then
  echo "Could not determine Nix dynamic linker path"
  exit 1
fi

echo "Using Nix linker: $NIX_LINKER"

# Patch the binary
nix-shell -p patchelf --run "patchelf --set-interpreter $NIX_LINKER $WORKERD_PATH"

if [ $? -eq 0 ]; then
  echo "✓ Successfully patched workerd binary"
else
  echo "✗ Failed to patch workerd binary"
  exit 1
fi
