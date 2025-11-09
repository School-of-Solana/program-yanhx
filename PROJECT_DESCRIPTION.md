# Project Description

**Deployed Frontend URL:** https://merkle-distibutor-app-yanhx-ryans-projects-1bd7cdbd.vercel.app/

**Solana Program ID:** `8LxW6m2hQymvR5hxvDC68P6Qfk5muvFv7ttnDgYSQGzb`

## Project Overview

### Description

The Merkle Distributor is a Solana dApp built with the Anchor framework that enables efficient and gas-optimized distribution of SPL tokens to a large number of recipients using Merkle tree proofs. This dApp solves the problem of expensive on-chain storage and transaction costs when distributing tokens to thousands of recipients.

The core functionality allows administrators to:
- Initialize a token distribution system with a Merkle root
- Build and update Merkle trees containing recipient addresses and their eligible token amounts
- Enable eligible recipients to claim their tokens by providing cryptographic Merkle proofs
- Manage administrative functions such as changing admin and shutting down the distributor

The frontend is a modern Next.js application that provides an intuitive interface for both administrators and users to interact with the Merkle Distributor program. It features real-time status updates, transaction history, and seamless wallet integration.

### Key Features

- **Gas Efficient Token Distribution**: Recipients only need to submit a single transaction with a Merkle proof to claim tokens, eliminating the need for individual on-chain transactions for each recipient
- **Scalable Architecture**: Can handle thousands of recipients without storing all recipient data on-chain, only the Merkle root is stored
- **Secure Proof Verification**: Uses cryptographic Merkle proofs with double-hashing (SHA-256) to verify eligibility and prevent fraud
- **Flexible Claiming**: Supports partial claims and incremental distributions - users can claim portions of their total allocation over time
- **Admin Controls**: Comprehensive administrative functions including root updates, admin changes, and emergency shutdown with token recovery
- **User-Friendly Frontend**: Modern web interface with wallet integration, real-time status updates, and intuitive UI for both admins and users
- **Real-time Status Monitoring**: View distributor configuration, Merkle root, token vault balance, and shutdown status
- **Merkle Tree Builder**: Interactive tool for building and updating Merkle trees with recipient addresses and amounts

### How to Use the dApp

1. **Connect Wallet**
   - Click the "Connect Wallet" button in the header
   - Select your Solana wallet (Phantom, Solflare, etc.)
   - Approve the connection request

2. **View Distributor Status** (All Users)
   - Navigate to the "Status" tab
   - View current Merkle root, admin address, mint address, token vault, and shutdown status
   - Check if the distributor is initialized and operational

3. **Initialize Distributor** (Admin Only)
   - Navigate to the "Initialize" tab
   - Enter the SPL Token mint address (or use the deployed mint address)
   - Click "Initialize Distributor"
   - Sign the transaction with your wallet
   - Wait for confirmation

4. **Update Merkle Root** (Admin Only)
   - Navigate to the "Update Root" tab
   - Add leaves by entering:
     - Claimant address (public key)
     - Amount (in token units)
   - Click "Add Leaf" for each recipient
   - Review the Merkle tree structure
   - Once all leaves are added, click "Update Root"
   - Sign the transaction

5. **Claim Tokens** (Users)
   - Navigate to the "Claim Tokens" tab
   - Add leaves to build the Merkle tree (must match the admin's tree)
   - Ensure your connected wallet address is in the leaves list
   - Click "Claim Tokens"
   - Sign the transaction
   - Tokens will be transferred to your associated token account

## Program Architecture

The Merkle Distributor program is built using the Anchor framework and follows a PDA-based architecture for secure account management. The program uses Merkle trees to efficiently verify eligibility without storing all recipient data on-chain.

### Data Flow

1. **Initialization**: Admin initializes the distributor with a mint address, creating the Config PDA and token vault
2. **Tree Building**: Admin builds a Merkle tree off-chain with recipient addresses and amounts
3. **Root Update**: Admin updates the Merkle root on-chain (only the root hash is stored)
4. **Claiming**: Users provide Merkle proofs to claim their tokens, which are verified against the stored root
5. **Partial Claims**: Users can claim portions of their total allocation incrementally

### PDA Usage

The program uses Program Derived Addresses (PDAs) to create deterministic account addresses without requiring additional signers. This ensures secure and predictable account management.

**PDAs Used:**

- **DistributorConfig PDA**: 
  - **Seeds**: `["DistributorConfig"]`
  - **Purpose**: Stores the distributor configuration including Merkle root, mint address, token vault, admin address, and shutdown status
  - **Why**: Provides a deterministic address for the distributor configuration that can be derived by anyone, eliminating the need for a separate keypair

- **ClaimedRewards PDA**: 
  - **Seeds**: `["ClaimedRewards", claimant_pubkey]`
  - **Purpose**: Tracks the amount already claimed by each recipient to support partial claims
  - **Why**: Creates a unique account per claimant without requiring them to initialize it, and ensures we can track claims even if a user hasn't interacted with the program before

### Program Instructions

**Instructions Implemented:**

- **`initialize`**: Sets up the distributor with initial configuration
  - Creates the DistributorConfig PDA
  - Initializes the token vault with the distributor as authority
  - Sets initial values (root = zero, shutdown = false)
  - Only callable once per program instance

- **`claim`**: Allows recipients to claim their tokens using Merkle proofs
  - Verifies the distributor is not shut down
  - Checks that the claim amount is greater than already claimed
  - Validates the Merkle proof against the stored root
  - Transfers the difference between total_amount and already_claimed
  - Updates the claimed amount in ClaimedRewards PDA
  - Supports partial claims

- **`update_root`**: Updates the Merkle root (admin only)
  - Verifies admin authorization
  - Ensures new root is different from current root
  - Updates the root in the config
  - Allows adding new recipients or modifying distributions

- **`set_admin`**: Changes the admin address (admin only)
  - Verifies current admin authorization
  - Ensures new admin is different from current admin
  - Updates the admin in the config
  - Useful for transferring control or implementing multi-sig

- **`shutdown`**: Shuts down the distributor and transfers all remaining tokens to the admin (admin only)
  - Verifies admin authorization
  - Ensures distributor is not already shut down
  - Sets shutdown flag to true
  - Transfers all remaining tokens from vault to admin
  - Prevents further claims after shutdown

### Account Structure

The program uses two main account structures:

**DistributorConfig Account:**

```rust
#[account]
pub struct DistributorConfig {
    pub bump: u8,                    // PDA bump seed
    pub root: [u8; HASH_BYTES],      // Merkle root (32 bytes)
    pub mint: Pubkey,                // SPL Token mint address
    pub token_vault: Pubkey,         // Token vault address
    pub admin: Pubkey,               // Admin address
    pub shutdown: bool,              // Shutdown flag
}
```

- **Purpose**: Stores the distributor configuration and state
- **Fields**:
  - `bump`: PDA bump seed for address derivation
  - `root`: Current Merkle root hash (32 bytes)
  - `mint`: SPL Token mint address for the distribution
  - `token_vault`: Associated token account holding distribution tokens
  - `admin`: Admin public key with administrative privileges
  - `shutdown`: Boolean flag indicating if distributor is shut down

**ClaimedRewards Account:**

```rust
#[account]
pub struct ClaimedRewards {
    pub bump: u8,                    // PDA bump seed
    pub claimed: u64,                // Amount already claimed
}
```

- **Purpose**: Tracks the amount already claimed by each recipient
- **Fields**:
  - `bump`: PDA bump seed for address derivation
  - `claimed`: Total amount already claimed by this recipient (u64)

## Testing

### Test Coverage

The program includes comprehensive test coverage for both happy path and error scenarios. All tests are implemented using Anchor's testing framework with TypeScript/JavaScript.

**Happy Path Tests:**

- **Initialize Distributor**: Verifies successful initialization of the distributor with correct admin, mint, and initial state
- **Update Merkle Root**: Tests updating the Merkle root with a valid tree and verifies the root is stored correctly
- **Mint Tokens and Claim Rewards**: Tests the complete flow of minting tokens to vault, building a Merkle tree, updating root, and successfully claiming tokens with valid proof
- **Partial Claim and Full Claim**: Tests incremental claiming where a user first claims a portion (2000 tokens) and then claims the remaining amount (3000 tokens) up to their total allocation (5000 tokens)
- **Set New Admin**: Verifies successful admin change from one address to another

**Unhappy Path Tests:**

- **Update Root with Same Value**: Tests that updating root with the same value fails with `SameValue` error
- **Update Root with Unauthorized User**: Tests that non-admin users cannot update the root, fails with `Unauthorized` error
- **Claim with Invalid Proof**: Tests that claiming with an invalid Merkle proof fails with `InvalidProof` error
- **Claim More Than Total Amount**: Tests that claiming more than the total eligible amount fails with `InvalidProof` error
- **Claim After Shutdown**: Tests that claiming tokens after shutdown fails with `Shutdown` error
- **Set Admin with Same Address**: Tests that setting admin to the same address fails with `SameValue` error
- **Set Admin with Unauthorized User**: Tests that non-admin users cannot change admin, fails with `Unauthorized` error

### Running Tests

```bash
# Navigate to the anchor project directory
cd anchor_project/merkle-distributor

# Run all tests
anchor test

# Run tests with specific network (default is localnet)
anchor test --provider.cluster devnet
```

The test suite includes:
- Setup and teardown of test accounts
- Merkle tree building and proof generation utilities
- Comprehensive instruction testing
- Error code verification
- Account state verification

### Additional Notes for Evaluators

**Merkle Proof Implementation:**

- The program uses a double-hashing scheme: `hash(hash(claimant_pubkey || amount))`
- Sibling nodes in the Merkle tree are sorted by hash value before hashing pairs
- The proof verification reconstructs the Merkle path from leaf to root
- This matches Solana's `hashv` function implementation

**Frontend Integration:**

- The frontend implements Merkle tree operations using `js-sha256` to match the Rust program's hashing
- IDL is automatically fetched from the chain or falls back to local IDL
- The application is compatible with Anchor 0.31.0+ which introduced breaking changes to the Program constructor
- All deployment addresses are centralized in `src/lib/config.ts` for easy maintenance

**Deployment Information:**

- Program is deployed to Solana devnet
- Program ID: `8LxW6m2hQymvR5hxvDC68P6Qfk5muvFv7ttnDgYSQGzb`
- Config PDA: `5nJVQGmSD1pQSf92Tjh4u18noF1eToB3KnWEB1i1F7AP`
- Mint Address: `Hh7dyUMWVey87oPdkHeEpuMi7RLc7q5mkijJDrakHAKk`
- Token Vault: `85BPqHKXGEc7c4zvqarr9ENh4hotGafCJqJuWen7K4q6`
- Admin Wallet: `81u1DBHuj4xDRLFXgf2TLtWdVorkXcWacgJ6g42N1kB8`

**Security Considerations:**

- All admin-only instructions verify authorization before execution
- Merkle proof verification prevents unauthorized claims
- Shutdown mechanism allows emergency token recovery
- PDA-based architecture eliminates the need for additional signers
- Double-hashing scheme provides additional security for Merkle proofs

**Performance Optimizations:**

- Only Merkle root is stored on-chain, not all recipient data
- Single transaction per claim, regardless of tree size
- Efficient PDA derivation for account management
- Minimal on-chain storage requirements
