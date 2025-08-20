#!/bin/bash

# Complete fresh start - clean, rebuild, and start
echo "🔄 Fresh start for Visual Query Builder..."
echo "This will clean everything and rebuild from scratch."
echo ""

# Run clean
./scripts/clean.sh

echo ""
echo "⏳ Waiting 3 seconds before rebuild..."
sleep 3

# Run rebuild  
./scripts/rebuild.sh

echo ""
echo "⏳ Waiting 3 seconds before starting servers..."
sleep 3

# Start servers
./scripts/start.sh
