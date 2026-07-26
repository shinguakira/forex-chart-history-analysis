#!/bin/sh
#
# Container entrypoint. Two jobs:
#   1. Restore /app/data/forex.db from Azure Blob if a replica exists.
#      First boot of a brand-new install is a no-op (-if-replica-exists).
#   2. Hand off to `litestream replicate -exec ./forex-server` so litestream
#      becomes PID 1, tails the WAL into Blob, and forwards SIGTERM from
#      Container Apps down to forex-server for a clean shutdown.

set -eu

mkdir -p /app/data

litestream restore -if-replica-exists -config /etc/litestream.yml /app/data/forex.db

exec litestream replicate -config /etc/litestream.yml -exec "/app/forex-server"
