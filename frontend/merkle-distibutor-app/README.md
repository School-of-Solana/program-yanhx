# Merkle Distributor Frontend

A Next.js frontend application for interacting with the Merkle Distributor Solana program.

## Features

- **Distributor Status**: View the current state of the distributor, including admin, mint, token vault, and Merkle root
- **Initialize Distributor**: Set up a new distributor with a mint address (admin only)
- **Update Merkle Root**: Add or update recipients in the Merkle tree (admin only)
- **Claim Tokens**: Eligible users can claim their tokens using Merkle proofs

## Getting Started

### Prerequisites

- Node.js 18+ and Yarn
- Solana CLI installed
- A Solana wallet (Phantom, Solflare, etc.)

### Installation

```bash
# Install dependencies
yarn install
```

### Development

```bash
# Start the development server
yarn dev
```

The application will be available at `http://localhost:3000`

### Build

```bash
# Build for production
yarn build

# Start production server
yarn start
```

## Usage

### 1. Connect Your Wallet

Click the "Connect Wallet" button in the header and select your Solana wallet.

### 2. Initialize Distributor (Admin)

1. Go to the "Initialize" tab
2. Enter the SPL Token mint address
3. Click "Initialize Distributor"
4. Sign the transaction with your wallet

### 3. Update Merkle Root (Admin)

1. Go to the "Admin" tab (only visible if you're the admin)
2. Add leaves by entering:
   - Claimant address (public key)
   - Amount (in token units)
3. Click "Add Leaf" for each recipient
4. Once all leaves are added, click "Update Root"
5. Sign the transaction

### 4. Claim Tokens (Users)

1. Go to the "Claim Tokens" tab
2. Add leaves to build the Merkle tree (same as admin process)
3. Make sure your connected wallet address is in the leaves list
4. Click "Claim Tokens"
5. Sign the transaction

## Project Structure

```
src/
├── app/                    # Next.js app directory
│   ├── layout.tsx         # Root layout
│   └── page.tsx           # Home page
├── components/
│   ├── merkle/            # Merkle distributor components
│   │   ├── distributor-status.tsx
│   │   ├── initialize-distributor.tsx
│   │   ├── update-root.tsx
│   │   ├── claim-tokens.tsx
│   │   └── merkle-distributor-feature.tsx
│   └── ui/                # UI components
└── lib/
    ├── program.ts         # Anchor program setup
    └── merkle-utils.ts    # Merkle tree utilities
```

## Configuration

The program ID is configured in `src/lib/program.ts`:

```typescript
export const MERKLE_DISTRIBUTOR_PROGRAM_ID = new PublicKey('8LxW6m2hQymvR5hxvDC68P6Qfk5muvFv7ttnDgYSQGzb')
```

## Notes

- The Merkle tree implementation uses a simplified hash function for demo purposes. In production, use a proper SHA-256 library.
- Make sure the Solana program is deployed to the network you're connecting to (localnet, devnet, or mainnet).
- The frontend automatically detects if you're the admin and shows the admin tab accordingly.

## License

This project is part of the Ackee Solana School program.
