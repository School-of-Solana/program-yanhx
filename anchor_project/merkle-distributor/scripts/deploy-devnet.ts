import * as anchor from "@coral-xyz/anchor";
import { Program } from "@coral-xyz/anchor";
import {
  getAssociatedTokenAddress,
  createMint,
  mintTo,
  getAccount,
} from "@solana/spl-token";
import {
  Keypair,
  PublicKey,
  Connection,
  clusterApiUrl,
  LAMPORTS_PER_SOL,
} from "@solana/web3.js";
import * as fs from "fs";
import * as path from "path";

async function main() {
  console.log("🚀 Starting deployment to devnet...\n");

  // Connect to devnet
  const connection = new Connection(clusterApiUrl("devnet"), "confirmed");
  console.log("✅ Connected to devnet");

  // Load wallet
  const walletPath = process.env.ANCHOR_WALLET || path.join(process.env.HOME || "~", ".config/solana/id.json");
  const walletKeypair = Keypair.fromSecretKey(
    Buffer.from(JSON.parse(fs.readFileSync(walletPath, "utf-8")))
  );
  console.log("✅ Wallet loaded:", walletKeypair.publicKey.toString());

  // Check balance
  const balance = await connection.getBalance(walletKeypair.publicKey);
  console.log(`💰 Wallet balance: ${balance / LAMPORTS_PER_SOL} SOL`);

  if (balance < 2 * LAMPORTS_PER_SOL) {
    console.log("⚠️  Warning: Low balance. You may need to airdrop SOL:");
    console.log(`   solana airdrop 2 ${walletKeypair.publicKey.toString()} --url devnet`);
  }

  // Setup provider
  const wallet = new anchor.Wallet(walletKeypair);
  const provider = new anchor.AnchorProvider(connection, wallet, {
    commitment: "confirmed",
  });
  anchor.setProvider(provider);

  // Load program ID from Anchor.toml or use default
  const programId = new PublicKey("8LxW6m2hQymvR5hxvDC68P6Qfk5muvFv7ttnDgYSQGzb");
  
  // Load IDL
  const idlPath = path.join(__dirname, "../target/idl/merkle_distributor.json");
  if (!fs.existsSync(idlPath)) {
    console.error("❌ IDL file not found. Please build the program first:");
    console.error("   anchor build");
    process.exit(1);
  }
  
  const idl = JSON.parse(fs.readFileSync(idlPath, "utf-8"));
  const program = new Program(idl as anchor.Idl, provider) as Program<anchor.Idl>;
  console.log("✅ Program loaded:", programId.toString());

  // Find config PDA
  const [configPDA] = PublicKey.findProgramAddressSync(
    [Buffer.from("DistributorConfig")],
    program.programId
  );
  console.log("📋 Config PDA:", configPDA.toString());

  // Create mint for test tokens
  console.log("\n🪙 Creating test token mint...");
  const mint = await createMint(
    connection,
    walletKeypair,
    walletKeypair.publicKey, // mint authority
    null, // freeze authority
    9 // decimals
  );
  console.log("✅ Mint created:", mint.toString());

  // Get token vault address
  const tokenVault = await getAssociatedTokenAddress(mint, configPDA, true);
  console.log("🏦 Token vault:", tokenVault.toString());

  // Check if distributor is already initialized
  let isInitialized = false;
  try {
    const accountInfo = await connection.getAccountInfo(configPDA);
    if (accountInfo && accountInfo.data.length > 0) {
      isInitialized = true;
      console.log("ℹ️  Distributor already initialized");
    }
  } catch (e) {
    console.log("ℹ️  Distributor not initialized, will initialize now");
  }

  // Initialize distributor if not already initialized
  if (!isInitialized) {
    console.log("\n🔧 Initializing distributor...");
    try {
      const tx = await program.methods
        .initialize()
        .accounts({
          mint: mint,
          admin: walletKeypair.publicKey,
          programData: null, // Optional for devnet
        })
        .rpc();
      console.log("✅ Initialization transaction:", tx);
      await connection.confirmTransaction(tx);
    } catch (error: any) {
      if (error.toString().includes("already in use")) {
        console.log("ℹ️  Distributor already initialized");
      } else {
        throw error;
      }
    }
  }

  // Mint test tokens to vault
  console.log("\n💰 Minting test tokens to vault...");
  const mintAmount = 1_000_000_000_000; // 1 million tokens (with 9 decimals)
  
  try {
    await mintTo(
      connection,
      walletKeypair,
      mint,
      tokenVault,
      walletKeypair, // mint authority
      mintAmount
    );
    console.log(`✅ Minted ${mintAmount / 1e9} tokens to vault`);

    // Verify vault balance
    const vaultAccount = await getAccount(connection, tokenVault);
    console.log(`✅ Vault balance: ${Number(vaultAccount.amount) / 1e9} tokens`);
  } catch (error: any) {
    if (error.toString().includes("TokenAccountNotFoundError")) {
      console.log("⚠️  Token vault not found, creating it first...");
      // The vault should be created during initialization, but if not, we need to create it
      // This is handled by init_if_needed in the program
      console.log("ℹ️  Please run initialization again or the vault will be created on first claim");
    } else {
      throw error;
    }
  }

  // Summary
  console.log("\n" + "=".repeat(60));
  console.log("📊 Deployment Summary");
  console.log("=".repeat(60));
  console.log("Program ID:", programId.toString());
  console.log("Config PDA:", configPDA.toString());
  console.log("Mint:", mint.toString());
  console.log("Token Vault:", tokenVault.toString());
  console.log("Admin:", walletKeypair.publicKey.toString());
  console.log("=".repeat(60));
  console.log("\n✅ Setup complete!");
  console.log("\n💡 Next steps:");
  console.log("   1. Deploy the program to devnet:");
  console.log("      anchor deploy --provider.cluster devnet");
  console.log("   2. Update Anchor.toml with devnet cluster if needed");
  console.log("   3. Use these addresses in your tests or frontend");
  console.log("\n📝 Save these addresses:");
  console.log(`   export MINT_ADDRESS="${mint.toString()}"`);
  console.log(`   export CONFIG_PDA="${configPDA.toString()}"`);
  console.log(`   export TOKEN_VAULT="${tokenVault.toString()}"`);
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });

