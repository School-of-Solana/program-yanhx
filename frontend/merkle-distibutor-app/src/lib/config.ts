import { PublicKey } from '@solana/web3.js'

/**
 * Deployment configuration for Merkle Distributor on devnet
 * These addresses are from the actual deployment to devnet
 */
export const DEPLOYMENT_CONFIG = {
  // Program ID
  PROGRAM_ID: new PublicKey('8LxW6m2hQymvR5hxvDC68P6Qfk5muvFv7ttnDgYSQGzb'),
  
  // Deployed accounts
  CONFIG_PDA: new PublicKey('5nJVQGmSD1pQSf92Tjh4u18noF1eToB3KnWEB1i1F7AP'),
  MINT_ADDRESS: new PublicKey('Hh7dyUMWVey87oPdkHeEpuMi7RLc7q5mkijJDrakHAKk'),
  TOKEN_VAULT: new PublicKey('85BPqHKXGEc7c4zvqarr9ENh4hotGafCJqJuWen7K4q6'),
  ADMIN_WALLET: new PublicKey('81u1DBHuj4xDRLFXgf2TLtWdVorkXcWacgJ6g42N1kB8'),
  
  // Transaction signatures
  DEPLOYMENT_SIGNATURE: '3GeR7ucgabwHvSD8fR3btkMGv9Q3Xkn7B9D2UKcehosvMjJYj7qyngJSmk78xMQbr7hQJtS66vy9Bz2pAQLGiYvs',
  INITIALIZATION_SIGNATURE: '2Z4FrxUKKSrv7DzgMcV8vYoqXABHCiNb7aLVmrChgtPR6J1bJQyYyH6duSko1VykTa2KUvRenEcVnsUUwmcgePDT',
  
  // Cluster
  CLUSTER: 'devnet',
  CLUSTER_URL: 'https://api.devnet.solana.com',
  
  // Token information
  INITIAL_SUPPLY: 1000,
  VAULT_BALANCE: 1000,
} as const

/**
 * Helper function to get deployment info as strings
 */
export function getDeploymentInfo() {
  return {
    programId: DEPLOYMENT_CONFIG.PROGRAM_ID.toString(),
    configPDA: DEPLOYMENT_CONFIG.CONFIG_PDA.toString(),
    mintAddress: DEPLOYMENT_CONFIG.MINT_ADDRESS.toString(),
    tokenVault: DEPLOYMENT_CONFIG.TOKEN_VAULT.toString(),
    adminWallet: DEPLOYMENT_CONFIG.ADMIN_WALLET.toString(),
    cluster: DEPLOYMENT_CONFIG.CLUSTER,
    clusterUrl: DEPLOYMENT_CONFIG.CLUSTER_URL,
  }
}

