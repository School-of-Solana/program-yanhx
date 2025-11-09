import * as anchor from "@coral-xyz/anchor";
import { Program } from "@coral-xyz/anchor";
import { MerkleDistributor } from "../target/types/merkle_distributor";
import {
  getAssociatedTokenAddress,
  createMint,
  mintTo,
  getAccount,
} from "@solana/spl-token";
import {
  Keypair,
  PublicKey,
  LAMPORTS_PER_SOL,
} from "@solana/web3.js";
import { expect } from "chai";
import { createHash } from "crypto";

// Merkle Tree utilities
interface Leaf {
  claimant: PublicKey;
  amount: anchor.BN;
}

function hash(data: Buffer): Buffer {
  return createHash("sha256").update(data).digest();
}

function hashPair(left: Buffer, right: Buffer): Buffer {
  if (left.compare(right) <= 0) {
    return hash(Buffer.concat([left, right]));
  } else {
    return hash(Buffer.concat([right, left]));
  }
}

function createLeaf(claimant: PublicKey, amount: anchor.BN): Buffer {
  const claimantBytes = claimant.toBuffer();
  const amountBytes = Buffer.alloc(8);
  amountBytes.writeBigUInt64BE(BigInt(amount.toString()), 0);
  const input = hash(Buffer.concat([claimantBytes, amountBytes]));
  return hash(input); // Double hash as per the program
}

function buildMerkleTree(leaves: Buffer[]): Buffer[][] {
  if (leaves.length === 0) return [];
  if (leaves.length === 1) return [leaves];

  const tree: Buffer[][] = [leaves];
  let currentLevel = leaves;

  while (currentLevel.length > 1) {
    const nextLevel: Buffer[] = [];
    for (let i = 0; i < currentLevel.length; i += 2) {
      if (i + 1 < currentLevel.length) {
        nextLevel.push(hashPair(currentLevel[i], currentLevel[i + 1]));
      } else {
        nextLevel.push(currentLevel[i]);
      }
    }
    tree.push(nextLevel);
    currentLevel = nextLevel;
  }

  return tree;
}

function getProof(
  tree: Buffer[][],
  leafIndex: number
): Buffer[] {
  const proof: Buffer[] = [];
  let index = leafIndex;

  for (let level = 0; level < tree.length - 1; level++) {
    const isLeft = index % 2 === 0;
    const siblingIndex = isLeft ? index + 1 : index - 1;

    if (siblingIndex < tree[level].length) {
      proof.push(tree[level][siblingIndex]);
    }

    index = Math.floor(index / 2);
  }

  return proof;
}

function bufferToArray32(buffer: Buffer): number[] {
  if (buffer.length !== 32) {
    throw new Error("Buffer must be 32 bytes");
  }
  return Array.from(buffer);
}

describe("merkle-distributor", () => {
  // Configure the client to use the local cluster.
  const provider = anchor.AnchorProvider.env();
  anchor.setProvider(provider);

  const program = anchor.workspace
    .merkleDistributor as Program<MerkleDistributor>;

  // Test accounts
  let admin: Keypair;
  let newAdmin: Keypair;
  let mint: PublicKey;
  let mintAuthority: Keypair;
  let claimant1: Keypair;
  let claimant2: Keypair;
  let claimant3: Keypair;

  // Distributor config PDA
  const [configPDA] = PublicKey.findProgramAddressSync(
    [Buffer.from("DistributorConfig")],
    program.programId
  );

  let tokenVault: PublicKey;
  let merkleRoot: Buffer;

  before(async () => {
    // Create test keypairs
    admin = Keypair.generate();
    newAdmin = Keypair.generate();
    mintAuthority = Keypair.generate();
    claimant1 = Keypair.generate();
    claimant2 = Keypair.generate();
    claimant3 = Keypair.generate();

    // Airdrop SOL to accounts
    const airdropAmount = 10 * LAMPORTS_PER_SOL;
    await provider.connection.requestAirdrop(
      admin.publicKey,
      airdropAmount
    );
    await provider.connection.requestAirdrop(
      newAdmin.publicKey,
      airdropAmount
    );
    await provider.connection.requestAirdrop(
      mintAuthority.publicKey,
      airdropAmount
    );
    await provider.connection.requestAirdrop(
      claimant1.publicKey,
      airdropAmount
    );
    await provider.connection.requestAirdrop(
      claimant2.publicKey,
      airdropAmount
    );
    await provider.connection.requestAirdrop(
      claimant3.publicKey,
      airdropAmount
    );

    // Wait for airdrops to confirm
    await new Promise((resolve) => setTimeout(resolve, 1000));

    // Create SPL Token mint
    mint = await createMint(
      provider.connection,
      admin,
      mintAuthority.publicKey,
      null,
      9
    );

    // Get token vault address
    tokenVault = await getAssociatedTokenAddress(mint, configPDA, true);
  });

  it("Initializes the distributor", async () => {
    // Get program data address
    const programDataAddress = (
      await PublicKey.findProgramAddress(
        [program.programId.toBuffer()],
        new PublicKey("BPFLoaderUpgradeab1e11111111111111111111111")
      )
    )[0];

    // Try to fetch program data
    const programDataAccount = await provider.connection.getAccountInfo(
      programDataAddress
    );

    // program_data is now optional, so we can pass null if it doesn't exist
    const accounts: any = {
      mint: mint,
      admin: admin.publicKey,
    };

    // Only add program_data if it exists
    if (programDataAccount) {
      accounts.programData = programDataAddress;
    } else {
      accounts.programData = null;
    }

    const tx = await program.methods
      .initialize()
      .accounts(accounts)
      .signers([admin])
      .rpc();

    console.log("Initialize transaction signature:", tx);

    // Verify config account
    const configAccount = await program.account.distributorConfig.fetch(
      configPDA
    );
    expect(configAccount.admin.toString()).to.equal(
      admin.publicKey.toString()
    );
    expect(configAccount.mint.toString()).to.equal(mint.toString());
    expect(configAccount.shutdown).to.be.false;
  });

  it("Updates the Merkle root", async () => {
    // Create test leaves
    const leaves: Leaf[] = [
      { claimant: claimant1.publicKey, amount: new anchor.BN(1000) },
      { claimant: claimant2.publicKey, amount: new anchor.BN(2000) },
      { claimant: claimant3.publicKey, amount: new anchor.BN(3000) },
    ];

    // Build Merkle tree
    const leafBuffers = leaves.map((leaf) =>
      createLeaf(leaf.claimant, leaf.amount)
    );
    const tree = buildMerkleTree(leafBuffers);
    merkleRoot = tree[tree.length - 1][0];

    const newRoot = Array.from(merkleRoot);

    const tx = await program.methods
      .updateRoot(newRoot)
      .accounts({
        admin: admin.publicKey,
      })
      .signers([admin])
      .rpc();

    console.log("Update root transaction signature:", tx);

    // Verify root was updated
    const configAccount = await program.account.distributorConfig.fetch(
      configPDA
    );
    expect(Buffer.from(configAccount.root)).to.deep.equal(merkleRoot);
  });

  it("Fails to update root with same value", async () => {
    const sameRoot = Array.from(merkleRoot);

    try {
      await program.methods
        .updateRoot(sameRoot)
        .accounts({
          admin: admin.publicKey,
        })
        .signers([admin])
        .rpc();
      expect.fail("Should have thrown an error");
    } catch (err: any) {
      expect(err.error?.errorCode?.code || err.toString()).to.include("SameValue");
    }
  });

  it("Fails to update root with unauthorized user", async () => {
    const unauthorizedUser = Keypair.generate();
    await provider.connection.requestAirdrop(
      unauthorizedUser.publicKey,
      LAMPORTS_PER_SOL
    );
    await new Promise((resolve) => setTimeout(resolve, 1000));

    const newRoot = Buffer.alloc(32, 1);
    try {
      await program.methods
        .updateRoot(Array.from(newRoot))
        .accounts({
          admin: unauthorizedUser.publicKey,
        })
        .signers([unauthorizedUser])
        .rpc();
      expect.fail("Should have thrown an error");
    } catch (err: any) {
      expect(err.error?.errorCode?.code || err.toString()).to.include("Unauthorized");
    }
  });

  it("Mints tokens to vault and claims rewards", async () => {
    // Mint tokens to vault
    const mintAmount = 10000;
    await mintTo(
      provider.connection,
      admin,
      mint,
      tokenVault,
      mintAuthority,
      mintAmount
    );

    // Verify vault has tokens
    const vaultAccount = await getAccount(provider.connection, tokenVault);
    expect(Number(vaultAccount.amount)).to.equal(mintAmount);

    // Create leaves and tree with different amounts to avoid SameValue error
    const leaves: Leaf[] = [
      { claimant: claimant1.publicKey, amount: new anchor.BN(1500) },
      { claimant: claimant2.publicKey, amount: new anchor.BN(2500) },
      { claimant: claimant3.publicKey, amount: new anchor.BN(3500) },
    ];

    const leafBuffers = leaves.map((leaf) =>
      createLeaf(leaf.claimant, leaf.amount)
    );
    const tree = buildMerkleTree(leafBuffers);
    const root = tree[tree.length - 1][0];

    // Check current root to avoid SameValue error
    const configAccount = await program.account.distributorConfig.fetch(
      configPDA
    );
    const currentRoot = Buffer.from(configAccount.root);
    
    // Only update if root is different
    if (!currentRoot.equals(root)) {
      await program.methods
        .updateRoot(Array.from(root))
        .accounts({
          admin: admin.publicKey,
        })
        .signers([admin])
        .rpc();
    }

    // Claim for claimant1
    const leafIndex = 0;
    const proof = getProof(tree, leafIndex);
    const proofArray = proof.map((p) => bufferToArray32(p));
    const claimant1Amount = leaves[leafIndex].amount;

    const [claimedRewardsPDA] = PublicKey.findProgramAddressSync(
      [Buffer.from("ClaimedRewards"), claimant1.publicKey.toBuffer()],
      program.programId
    );
    const claimant1TokenAccount = await getAssociatedTokenAddress(
      mint,
      claimant1.publicKey
    );

    const tx = await program.methods
      .claim(claimant1Amount, proofArray)
      .accounts({
        mint: mint,
        claimant: claimant1.publicKey,
      })
      .signers([claimant1])
      .rpc();

    console.log("Claim transaction signature:", tx);

    // Verify tokens were transferred
    const claimant1TokenAccountInfo = await getAccount(
      provider.connection,
      claimant1TokenAccount
    );
    expect(Number(claimant1TokenAccountInfo.amount)).to.equal(1500);

    // Verify claimed rewards account
    const claimedRewardsAccount =
      await program.account.claimedRewards.fetch(claimedRewardsPDA);
    expect(claimedRewardsAccount.claimed.toString()).to.equal("1500");
  });

  it("Fails to claim with invalid proof", async () => {
    const newClaimant = Keypair.generate();
    await provider.connection.requestAirdrop(
      newClaimant.publicKey,
      LAMPORTS_PER_SOL
    );
    await new Promise((resolve) => setTimeout(resolve, 1000));

    const invalidProof = [Buffer.alloc(32, 1), Buffer.alloc(32, 2)].map((p) =>
      bufferToArray32(p)
    );

    try {
      await program.methods
        .claim(new anchor.BN(1000), invalidProof)
        .accounts({
          mint: mint,
          claimant: newClaimant.publicKey,
        })
        .signers([newClaimant])
        .rpc();
      expect.fail("Should have thrown an error");
    } catch (err: any) {
      expect(err.error?.errorCode?.code || err.toString()).to.include("InvalidProof");
    }
  });

  it("Fails to claim more than total amount", async () => {
    const newClaimant = Keypair.generate();
    await provider.connection.requestAirdrop(
      newClaimant.publicKey,
      LAMPORTS_PER_SOL
    );
    await new Promise((resolve) => setTimeout(resolve, 1000));

    const leaves: Leaf[] = [
      { claimant: newClaimant.publicKey, amount: new anchor.BN(1000) },
    ];

    const leafBuffers = leaves.map((leaf) =>
      createLeaf(leaf.claimant, leaf.amount)
    );
    const tree = buildMerkleTree(leafBuffers);
    const root = tree[tree.length - 1][0];

    await program.methods
      .updateRoot(Array.from(root))
      .accounts({
        admin: admin.publicKey,
      })
      .signers([admin])
      .rpc();

    const proof = getProof(tree, 0);
    const proofArray = proof.map((p) => bufferToArray32(p));

    try {
      await program.methods
        .claim(new anchor.BN(2000), proofArray) // More than allowed (1000)
        .accounts({
          mint: mint,
          claimant: newClaimant.publicKey,
        })
        .signers([newClaimant])
        .rpc();
      expect.fail("Should have thrown an error");
    } catch (err: any) {
      expect(err.error?.errorCode?.code || err.toString()).to.include("InvalidProof");
    }
  });

  it("Allows partial claim and then full claim", async () => {
    const newClaimant = Keypair.generate();
    await provider.connection.requestAirdrop(
      newClaimant.publicKey,
      LAMPORTS_PER_SOL
    );
    await new Promise((resolve) => setTimeout(resolve, 1000));

    await mintTo(
      provider.connection,
      admin,
      mint,
      tokenVault,
      mintAuthority,
      10000
    );

    const [claimedRewardsPDA] = PublicKey.findProgramAddressSync(
      [Buffer.from("ClaimedRewards"), newClaimant.publicKey.toBuffer()],
      program.programId
    );
    const newClaimantTokenAccount = await getAssociatedTokenAddress(
      mint,
      newClaimant.publicKey
    );

    // First claim: create leaf with total amount 2000
    const firstAmount = new anchor.BN(2000);
    const firstLeaves: Leaf[] = [
      { claimant: newClaimant.publicKey, amount: firstAmount },
    ];

    const firstTree = buildMerkleTree(
      firstLeaves.map((leaf) => createLeaf(leaf.claimant, leaf.amount))
    );
    const firstRoot = firstTree[firstTree.length - 1][0];

    await program.methods
      .updateRoot(Array.from(firstRoot))
      .accounts({
        admin: admin.publicKey,
      })
      .signers([admin])
      .rpc();

    const firstProofArray = getProof(firstTree, 0).map((p) =>
      bufferToArray32(p)
    );
    await program.methods
      .claim(firstAmount, firstProofArray)
      .accounts({
        mint: mint,
        claimant: newClaimant.publicKey,
      })
      .signers([newClaimant])
      .rpc();

    // Verify first claim
    let tokenAccount = await getAccount(
      provider.connection,
      newClaimantTokenAccount
    );
    expect(Number(tokenAccount.amount)).to.equal(2000);

    let claimedRewardsAccount =
      await program.account.claimedRewards.fetch(claimedRewardsPDA);
    expect(claimedRewardsAccount.claimed.toString()).to.equal("2000");

    // Second claim: create leaf with total amount 5000
    const totalAmount = new anchor.BN(5000);
    const secondLeaves: Leaf[] = [
      { claimant: newClaimant.publicKey, amount: totalAmount },
    ];

    const secondTree = buildMerkleTree(
      secondLeaves.map((leaf) => createLeaf(leaf.claimant, leaf.amount))
    );
    const secondRoot = secondTree[secondTree.length - 1][0];

    await program.methods
      .updateRoot(Array.from(secondRoot))
      .accounts({
        admin: admin.publicKey,
      })
      .signers([admin])
      .rpc();

    const secondProofArray = getProof(secondTree, 0).map((p) =>
      bufferToArray32(p)
    );

    // Second claim: claim remaining 3000 (5000 - 2000)
    await program.methods
      .claim(totalAmount, secondProofArray)
      .accounts({
        mint: mint,
        claimant: newClaimant.publicKey,
      })
      .signers([newClaimant])
      .rpc();

    // Verify second claim
    tokenAccount = await getAccount(provider.connection, newClaimantTokenAccount);
    expect(Number(tokenAccount.amount)).to.equal(5000);

    claimedRewardsAccount =
      await program.account.claimedRewards.fetch(claimedRewardsPDA);
    expect(claimedRewardsAccount.claimed.toString()).to.equal("5000");
  });

  it("Fails to claim after shutdown", async () => {
    await program.methods
      .shutdown()
      .accounts({
        mint: mint,
        admin: admin.publicKey,
      })
      .signers([admin])
      .rpc();

    const leaves: Leaf[] = [
      { claimant: claimant2.publicKey, amount: new anchor.BN(2000) },
    ];

    const tree = buildMerkleTree(
      leaves.map((leaf) => createLeaf(leaf.claimant, leaf.amount))
    );
    const proofArray = getProof(tree, 0).map((p) => bufferToArray32(p));

    try {
      await program.methods
        .claim(new anchor.BN(2000), proofArray)
        .accounts({
          mint: mint,
          claimant: claimant2.publicKey,
        })
        .signers([claimant2])
        .rpc();
      expect.fail("Should have thrown an error");
    } catch (err: any) {
      expect(err.error?.errorCode?.code || err.toString()).to.include("Shutdown");
    }
  });

  it("Sets new admin", async () => {
    const tx = await program.methods
      .setAdmin(newAdmin.publicKey)
      .accounts({
        admin: admin.publicKey,
      })
      .signers([admin])
      .rpc();

    console.log("Set admin transaction signature:", tx);

    // Verify admin was updated
    const configAccount = await program.account.distributorConfig.fetch(
      configPDA
    );
    expect(configAccount.admin.toString()).to.equal(
      newAdmin.publicKey.toString()
    );
  });

  it("Fails to set admin with same address", async () => {
    try {
      await program.methods
        .setAdmin(newAdmin.publicKey)
        .accounts({
          admin: newAdmin.publicKey,
        })
        .signers([newAdmin])
        .rpc();
      expect.fail("Should have thrown an error");
    } catch (err: any) {
      expect(err.error?.errorCode?.code || err.toString()).to.include("SameValue");
    }
  });

  it("Fails to set admin with unauthorized user", async () => {
    const unauthorizedUser = Keypair.generate();
    await provider.connection.requestAirdrop(
      unauthorizedUser.publicKey,
      LAMPORTS_PER_SOL
    );
    await new Promise((resolve) => setTimeout(resolve, 1000));

    try {
      await program.methods
        .setAdmin(unauthorizedUser.publicKey)
        .accounts({
          admin: unauthorizedUser.publicKey,
        })
        .signers([unauthorizedUser])
        .rpc();
      expect.fail("Should have thrown an error");
    } catch (err: any) {
      expect(err.error?.errorCode?.code || err.toString()).to.include("Unauthorized");
    }
  });
});
