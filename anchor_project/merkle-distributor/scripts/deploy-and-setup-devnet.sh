#!/bin/bash

# Deploy program to devnet and setup test tokens
# Usage: ./scripts/deploy-and-setup-devnet.sh

set -e

echo "🚀 Deploying Merkle Distributor to Devnet..."
echo ""

# Check if anchor is installed
if ! command -v anchor &> /dev/null; then
    echo "❌ Anchor CLI not found. Please install it first:"
    echo "   cargo install --git https://github.com/coral-xyz/anchor avm --locked --force"
    echo "   avm install latest"
    echo "   avm use latest"
    exit 1
fi

# Check if solana CLI is installed
if ! command -v solana &> /dev/null; then
    echo "❌ Solana CLI not found. Please install it first:"
    echo "   sh -c \"\$(curl -sSfL https://release.solana.com/stable/install)\""
    exit 1
fi

# Set cluster to devnet
echo "📡 Setting cluster to devnet..."
solana config set --url devnet

# Check wallet
WALLET_PATH=$(solana config get | grep "Keypair Path" | awk '{print $3}')
if [ -z "$WALLET_PATH" ] || [ ! -f "$WALLET_PATH" ]; then
    echo "❌ Wallet not found. Please set up your wallet:"
    echo "   solana-keygen new"
    exit 1
fi

WALLET_PUBKEY=$(solana address)
echo "✅ Wallet: $WALLET_PUBKEY"

# Check balance
BALANCE=$(solana balance | awk '{print $1}')
echo "💰 Balance: $BALANCE SOL"

if (( $(echo "$BALANCE < 0.5" | bc -l) )); then
    echo "⚠️  Low balance. Requesting airdrop..."
    solana airdrop 2
    sleep 5
fi

# Build program
echo ""
echo "🔨 Building program..."
anchor build

# Deploy program
echo ""
echo "📦 Deploying program to devnet..."
anchor deploy --provider.cluster devnet

# Get program ID
PROGRAM_ID=$(solana address -k target/deploy/merkle_distributor-keypair.json)
echo "✅ Program deployed: $PROGRAM_ID"

# Run setup script
echo ""
echo "🔧 Setting up distributor and test tokens..."
yarn deploy:devnet

echo ""
echo "✅ Deployment complete!"

