# Merkle Distributor Frontend

A modern Next.js frontend application for interacting with the Merkle Distributor Solana program. This application provides a user-friendly interface for administrators to manage token distributions and for users to claim their tokens using Merkle proofs.

## Overview

The Merkle Distributor Frontend is a full-featured web application built with Next.js 15, React 19, and TypeScript. It integrates with the Solana blockchain through the Anchor framework and provides a seamless experience for managing and claiming token distributions.

## Features

### For Administrators

- **Distributor Status**: View the current state of the distributor, including admin address, mint address, token vault, Merkle root, and shutdown status
- **Initialize Distributor**: Set up a new distributor with an SPL Token mint address
- **Update Merkle Root**: Build and update the Merkle tree by adding recipient addresses and amounts
- **Admin Management**: Change the admin address or shut down the distributor

### For Users

- **Claim Tokens**: Claim eligible tokens by providing Merkle proofs
- **Real-time Status**: View the current distributor configuration and status
- **Transaction History**: Track claim transactions and balances

## Technology Stack

- **Framework**: Next.js 15.5.3 with App Router
- **UI Library**: React 19.1.1
- **Styling**: Tailwind CSS 4.1.13
- **Blockchain**: 
  - `@coral-xyz/anchor` ^0.32.1 - Anchor framework for Solana program interaction
  - `@solana/web3.js` ^1.95.8 - Solana JavaScript SDK
  - `@solana/spl-token` ^0.4.14 - SPL Token library
  - `@solana/wallet-adapter-react` - Wallet adapter for Solana wallet integration
- **State Management**: 
  - `@tanstack/react-query` ^5.89.0 - Server state management
  - `jotai` ^2.14.0 - Atomic state management
- **UI Components**: Radix UI primitives
- **Cryptography**: `js-sha256` ^0.11.1 - SHA-256 hashing for Merkle tree operations

## Project Structure

```
frontend/
└── merkle-distibutor-app/
    ├── src/
    │   ├── app/                    # Next.js app directory
    │   │   ├── layout.tsx         # Root layout with wallet provider
    │   │   └── page.tsx           # Home page with Merkle Distributor feature
    │   ├── components/
    │   │   ├── merkle/            # Merkle distributor components
    │   │   │   ├── distributor-status.tsx      # Display distributor status
    │   │   │   ├── initialize-distributor.tsx  # Initialize distributor (admin)
    │   │   │   ├── update-root.tsx             # Update Merkle root (admin)
    │   │   │   ├── claim-tokens.tsx            # Claim tokens (users)
    │   │   │   └── merkle-distributor-feature.tsx  # Main feature component
    │   │   ├── ui/                # Reusable UI components
    │   │   │   └── tabs.tsx       # Tabs component
    │   │   ├── account/           # Account-related components
    │   │   ├── cluster/          # Cluster management components
    │   │   └── solana/            # Solana provider components
    │   └── lib/
    │       ├── program.ts         # Anchor program setup and hooks
    │       ├── config.ts          # Deployment configuration
    │       ├── merkle-utils.ts    # Merkle tree utilities (SHA-256)
    │       └── merkle_distributor.json  # Program IDL
    ├── package.json
    └── README.md                  # Detailed setup instructions
```

## Key Components

### Program Integration (`lib/program.ts`)

- **`useMerkleDistributorProgram()`**: React hook for accessing the Anchor program instance
- **`getConfigPDA()`**: Helper function to get the Config PDA address
- **`getClaimedRewardsPDA()`**: Helper function to get the ClaimedRewards PDA address
- **IDL Management**: Automatically fetches IDL from chain or falls back to local IDL
- **Anchor 0.31.0+ Compatibility**: Uses the new Program constructor format

### Merkle Tree Utilities (`lib/merkle-utils.ts`)

- **`createLeaf()`**: Creates a Merkle tree leaf from claimant address and amount
- **`buildMerkleTree()`**: Builds a complete Merkle tree from leaves
- **`getProofForClaimant()`**: Generates Merkle proof for a specific claimant
- **`getMerkleRoot()`**: Calculates the Merkle root from leaves
- **SHA-256 Implementation**: Uses `js-sha256` to match Solana's `hashv` function

### Deployment Configuration (`lib/config.ts`)

Centralized configuration for deployed program addresses:
- Program ID
- Config PDA
- Mint Address
- Token Vault
- Admin Wallet
- Cluster (devnet/mainnet)

## Getting Started

### Prerequisites

- Node.js 18+ and npm/yarn
- Solana CLI installed (optional, for local development)
- A Solana wallet (Phantom, Solflare, etc.)

### Installation

```bash
cd merkle-distibutor-app
npm install
# or
yarn install
```

### Development

```bash
npm run dev
# or
yarn dev
```

The application will be available at `http://localhost:3000`

### Build

```bash
npm run build
npm run start
# or
yarn build
yarn start
```

## Usage

### 1. Connect Your Wallet

Click the "Connect Wallet" button in the header and select your Solana wallet (Phantom, Solflare, etc.).

### 2. View Distributor Status

The status tab displays:
- Current Merkle root
- Admin address
- Mint address
- Token vault address
- Shutdown status
- Deployment information

### 3. Initialize Distributor (Admin Only)

1. Navigate to the "Initialize" tab
2. Enter the SPL Token mint address (or use the deployed mint address)
3. Click "Initialize Distributor"
4. Sign the transaction with your wallet

### 4. Update Merkle Root (Admin Only)

1. Navigate to the "Update Root" tab
2. Add leaves by entering:
   - Claimant address (public key)
   - Amount (in token units)
3. Click "Add Leaf" for each recipient
4. Once all leaves are added, click "Update Root"
5. Sign the transaction

### 5. Claim Tokens (Users)

1. Navigate to the "Claim Tokens" tab
2. Add leaves to build the Merkle tree (must match the admin's tree)
3. Ensure your connected wallet address is in the leaves list
4. Click "Claim Tokens"
5. Sign the transaction

## Configuration

### Program ID

The program ID is configured in `src/lib/program.ts`:

```typescript
export const MERKLE_DISTRIBUTOR_PROGRAM_ID = new PublicKey('8LxW6m2hQymvR5hxvDC68P6Qfk5muvFv7ttnDgYSQGzb')
```

### Deployment Configuration

Deployment addresses are centralized in `src/lib/config.ts`:

```typescript
export const DEPLOYMENT_CONFIG = {
  PROGRAM_ID: new PublicKey('8LxW6m2hQymvR5hxvDC68P6Qfk5muvFv7ttnDgYSQGzb'),
  CONFIG_PDA: new PublicKey('5nJVQGmSD1pQSf92Tjh4u18noF1eToB3KnWEB1i1F7AP'),
  MINT_ADDRESS: new PublicKey('Hh7dyUMWVey87oPdkHeEpuMi7RLc7q5mkijJDrakHAKk'),
  TOKEN_VAULT: new PublicKey('85BPqHKXGEc7c4zvqarr9ENh4hotGafCJqJuWen7K4q6'),
  ADMIN_WALLET: new PublicKey('81u1DBHuj4xDRLFXgf2TLtWdVorkXcWacgJ6g42N1kB8'),
  CLUSTER: 'devnet'
}
```

## Technical Details

### Merkle Proof Generation

The frontend implements Merkle tree operations that match the Rust program:

1. **Leaf Creation**: 
   - Hashes `claimant_bytes || amount_bytes` using SHA-256
   - Applies double hashing: `hash(hash(input))`

2. **Tree Building**: 
   - Builds a binary Merkle tree
   - Sorts sibling nodes by hash value before hashing pairs

3. **Proof Generation**: 
   - Generates proof path from leaf to root
   - Converts proof to array format expected by the program

### IDL Handling

The application handles IDL loading and processing:

- **Chain IDL**: Attempts to fetch IDL from the deployed program (preferred)
- **Local IDL**: Falls back to local IDL file if chain fetch fails
- **IDL Processing**: Ensures compatibility with Anchor 0.31.0+ format
- **Account Type Resolution**: Automatically resolves account types from the types array

### Anchor 0.31.0+ Compatibility

The application is compatible with Anchor 0.31.0+ which introduced breaking changes:

- **Program Constructor**: Uses `new Program(idl, provider)` instead of `new Program(idl, programId, provider)`
- **IDL Address Field**: Program ID is inferred from the IDL's `address` field
- **Type Definitions**: Handles updated IDL structure and account type definitions

## Development Notes

- The Merkle tree implementation uses SHA-256 (`js-sha256`) to match Solana's `hashv` function
- All IDL processing is done client-side to ensure compatibility
- The application automatically detects the admin wallet and shows admin-only features
- Error handling is implemented throughout for better user experience

## License

This project is part of the Ackee Solana School program.
