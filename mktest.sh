#!/bin/sh
cd "$(dirname "$0")/site" && { printf '%s\n' '<!doctype html><html><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1,viewport-fit=cover"></head><body>'; cat index.html; printf '%s\n' '</body></html>'; } > test.html
