#!/usr/bin/env bash

# Ensure that package.json and public/manifest.json are in sync.
# Source of truth is package.json.
# What version is published to the Chrome Web Store is determined by public/manifest.json.
jq -r '.version' "package.json" | diff -u <(jq -r '.version' "public/manifest.json") -
if [ $? -eq 1 ]; then
  echo "Version in package.json and public/manifest.json are out of sync."
  exit 1
fi
