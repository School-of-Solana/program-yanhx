# Merkle Distributor

A Solana program built with Anchor framework for distributing SPL tokens using Merkle tree proofs. This program enables efficient and gas-optimized token distribution to a large number of recipients without requiring individual on-chain transactions for each recipient.

## Overview

The Merkle Distributor program allows administrators to:
- Initialize a token distribution system with a Merkle root
- Enable eligible recipients to claim their tokens by providing Merkle proofs
- Update the Merkle root to add new recipients or modify distributions
- Manage administrative functions such as changing admin and shutting down the distributor

## Features

- **Gas Efficient**: Recipients only need to submit a single transaction with a Merkle proof to claim tokens
- **Scalable**: Can handle thousands of recipients without storing all recipient data on-chain
- **Secure**: Uses cryptographic Merkle proofs to verify eligibility
- **Flexible**: Supports partial claims and incremental distributions
- **Admin Controls**: Includes administrative functions for managing the distributor

## Technical Architecture

### Program Structure

The program is built using the Anchor framework and consists of:

- **State Accounts**: 
  - `DistributorConfig`: Stores the distributor configuration including Merkle root, mint, token vault, and admin
  - `ClaimedRewards`: Tracks the amount claimed by each recipient

- **Instructions**:
  - `initialize`: Sets up the distributor with initial configuration
  - `claim`: Allows recipients to claim their tokens using Merkle proofs
  - `update_root`: Updates the Merkle root (admin only)
  - `set_admin`: Changes the admin address (admin only)
  - `shutdown`: Shuts down the distributor and transfers remaining tokens (admin only)

### Merkle Proof Verification

The program uses a double-hashing scheme for Merkle proof verification:
1. First, it hashes the claimant's public key and total amount: `hash(claimant_pubkey || total_amount)`
2. Then applies double hashing: `hash(hash(input))`
3. Verifies the proof by reconstructing the Merkle path and comparing with the stored root

The proof verification ensures that:
- The claimant is eligible for the specified amount
- The proof is valid for the current Merkle root
- The order of siblings in the proof is correct (sorted by hash value)

## Instructions

### Initialize

Initializes a new distributor instance.

**Accounts:**
- `config`: PDA account for distributor configuration (seeds: `["DistributorConfig"]`)
- `mint`: SPL Token mint account
- `token_vault`: Associated token account for holding distribution tokens
- `admin`: Admin account (signer)
- `program_data`: Optional program data account
- `program`: Merkle Distributor program
- `associated_token_program`: SPL Associated Token program
- `token_program`: SPL Token program
- `system_program`: Solana System program

**Behavior:**
- Creates the distributor config PDA
- Initializes the token vault with the distributor as authority
- Sets initial values (root = zero, shutdown = false)

### Claim

Allows a recipient to claim their tokens using a Merkle proof.

**Accounts:**
- `config`: Distributor config account
- `mint`: SPL Token mint account
- `claimed_rewards`: PDA account tracking claimed amount (seeds: `["ClaimedRewards", claimant]`)
- `from`: Token vault account (source)
- `to`: Recipient's associated token account (destination)
- `claimant`: Recipient account (signer)
- `token_program`: SPL Token program
- `associated_token_program`: SPL Associated Token program
- `system_program`: Solana System program

**Parameters:**
- `total_amount`: Total amount the recipient is eligible for (u64)
- `proof`: Merkle proof as array of hash bytes

**Behavior:**
- Verifies the distributor is not shut down
- Checks that the claim amount is greater than already claimed
- Validates the Merkle proof
- Transfers the difference between total_amount and already_claimed
- Updates the claimed amount

### Update Root

Updates the Merkle root (admin only).

**Accounts:**
- `config`: Distributor config account (mutable)
- `admin`: Admin account (signer, must match config.admin)

**Parameters:**
- `new_root`: New Merkle root hash (32 bytes)

**Behavior:**
- Verifies admin authorization
- Ensures new root is different from current root
- Updates the root in the config

### Set Admin

Changes the admin address (admin only).

**Accounts:**
- `config`: Distributor config account (mutable)
- `admin`: Current admin account (signer, must match config.admin)

**Parameters:**
- `new_admin`: New admin public key

**Behavior:**
- Verifies current admin authorization
- Ensures new admin is different from current admin
- Updates the admin in the config

### Shutdown

Shuts down the distributor and transfers all remaining tokens to the admin (admin only).

**Accounts:**
- `config`: Distributor config account (mutable)
- `mint`: SPL Token mint account
- `from`: Token vault account (source)
- `to`: Admin's associated token account (destination)
- `admin`: Admin account (signer, must match config.admin)
- `token_program`: SPL Token program
- `associated_token_program`: SPL Associated Token program
- `system_program`: Solana System program

**Behavior:**
- Verifies admin authorization
- Ensures distributor is not already shut down
- Sets shutdown flag to true
- Transfers all remaining tokens from vault to admin

## State Structures

### DistributorConfig

```rust
pub struct DistributorConfig {
    pub bump: u8,                    // PDA bump seed
    pub root: [u8; HASH_BYTES],      // Merkle root (32 bytes)
    pub mint: Pubkey,                // SPL Token mint address
    pub token_vault: Pubkey,         // Token vault address
    pub admin: Pubkey,               // Admin address
    pub shutdown: bool,               // Shutdown flag
}
```

**PDA Seeds:** `["DistributorConfig"]`

### ClaimedRewards

```rust
pub struct ClaimedRewards {
    pub claimed: u64,                // Amount already claimed
}
```

**PDA Seeds:** `["ClaimedRewards", claimant_pubkey]`

## Error Codes

- `AlreadyClaimed`: Recipient has already claimed the full amount
- `InsufficientBalance`: Token vault doesn't have enough balance
- `InvalidProof`: Merkle proof verification failed
- `Unauthorized`: Account is not authorized to execute the instruction
- `SameValue`: New value is identical to the current value
- `Shutdown`: Distributor has been shut down

## Development

### Prerequisites

- Rust (latest stable version)
- Solana CLI (v1.18+)
- Anchor Framework (v0.31.1)
- Node.js and Yarn

### Building

```bash
anchor build
```

### Testing

```bash
anchor test
```

### Program ID

The program ID is: `8LxW6m2hQymvR5hxvDC68P6Qfk5muvFv7ttnDgYSQGzb`

## Deployment Information

### Devnet Deployment

The program has been successfully deployed to Solana devnet with the following configuration:

**Program Details:**
- **Program ID**: `8LxW6m2hQymvR5hxvDC68P6Qfk5muvFv7ttnDgYSQGzb`
- **Deployment Signature**: `3GeR7ucgabwHvSD8fR3btkMGv9Q3Xkn7B9D2UKcehosvMjJYj7qyngJSmk78xMQbr7hQJtS66vy9Bz2pAQLGiYvs`
- **Cluster**: `https://api.devnet.solana.com`

**Deployed Accounts:**
- **Config PDA**: `5nJVQGmSD1pQSf92Tjh4u18noF1eToB3KnWEB1i1F7AP`
- **Mint Address**: `Hh7dyUMWVey87oPdkHeEpuMi7RLc7q5mkijJDrakHAKk`
- **Token Vault**: `85BPqHKXGEc7c4zvqarr9ENh4hotGafCJqJuWen7K4q6`
- **Admin Wallet**: `81u1DBHuj4xDRLFXgf2TLtWdVorkXcWacgJ6g42N1kB8`

**Initialization Transaction:**
- **Transaction Signature**: `2Z4FrxUKKSrv7DzgMcV8vYoqXABHCiNb7aLVmrChgtPR6J1bJQyYyH6duSko1VykTa2KUvRenEcVnsUUwmcgePDT`

**Token Information:**
- **Initial Supply**: 1000 tokens minted to the vault
- **Vault Balance**: 1000 tokens

### Environment Variables

For easy reference, you can export these addresses as environment variables:

```bash
export MINT_ADDRESS="Hh7dyUMWVey87oPdkHeEpuMi7RLc7q5mkijJDrakHAKk"
export CONFIG_PDA="5nJVQGmSD1pQSf92Tjh4u18noF1eToB3KnWEB1i1F7AP"
export TOKEN_VAULT="85BPqHKXGEc7c4zvqarr9ENh4hotGafCJqJuWen7K4q6"
export PROGRAM_ID="8LxW6m2hQymvR5hxvDC68P6Qfk5muvFv7ttnDgYSQGzb"
export ADMIN_WALLET="81u1DBHuj4xDRLFXgf2TLtWdVorkXcWacgJ6g42N1kB8"
```

### Deployment Commands

To deploy the program to devnet:

```bash
anchor deploy --provider.cluster devnet
```

To set up the distributor and test tokens:

```bash
yarn run deploy-devnet
```

## Usage Example

### 1. Initialize the Distributor

```typescript
await program.methods
  .initialize()
  .accounts({
    config: configPDA,
    mint: mintAddress,
    tokenVault: tokenVaultAddress,
    admin: admin.publicKey,
    // ... other accounts
  })
  .rpc();
```

### 2. Update Merkle Root

```typescript
await program.methods
  .updateRoot(newRoot)
  .accounts({
    config: configPDA,
    admin: admin.publicKey,
  })
  .rpc();
```

### 3. Claim Tokens

```typescript
await program.methods
  .claim(new BN(totalAmount), proof)
  .accounts({
    config: configPDA,
    mint: mintAddress,
    claimedRewards: claimedRewardsPDA,
    from: tokenVaultAddress,
    to: recipientTokenAccount,
    claimant: recipient.publicKey,
    // ... other accounts
  })
  .rpc();
```

## Security Considerations

1. **Merkle Root Management**: Only trusted admins should be able to update the Merkle root
2. **Proof Verification**: The program uses double-hashing and sorted sibling ordering for secure proof verification
3. **Partial Claims**: The program supports partial claims, allowing recipients to claim incrementally
4. **Shutdown Mechanism**: Admins can shut down the distributor in case of emergencies

