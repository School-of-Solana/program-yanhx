'use client'

import { Program, AnchorProvider, Idl } from '@coral-xyz/anchor'
import { PublicKey } from '@solana/web3.js'
import { useConnection, useWallet } from '@solana/wallet-adapter-react'
import { useState, useEffect } from 'react'

// Program ID from Anchor.toml
export const MERKLE_DISTRIBUTOR_PROGRAM_ID = new PublicKey('8LxW6m2hQymvR5hxvDC68P6Qfk5muvFv7ttnDgYSQGzb')

// Cache for loaded IDL
let cachedIdl: Idl | null = null

/**
 * Load IDL from local JSON file
 */
async function loadIdl(): Promise<Idl | null> {
  if (cachedIdl) return cachedIdl

  try {
    const idlJson = await import('./merkle_distributor.json')
    const jsonData = idlJson.default || idlJson
    
    // Process IDL to ensure correct format
    const processedIdl = processIdl(jsonData)
    if (processedIdl) {
      cachedIdl = processedIdl
    }
    return processedIdl
  } catch (error) {
    console.error('Failed to load IDL JSON:', error)
    return null
  }
}

/**
 * Process IDL to ensure correct format for Anchor
 */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
function processIdl(jsonData: any): Idl | null {
  if (!jsonData || Object.keys(jsonData).length === 0) {
    console.error('IDL JSON is empty or not loaded correctly')
    return null
  }

  const { address, metadata, ...rest } = jsonData
  
  // In Anchor 0.31.0+, the address field is required in the IDL
  // The Program constructor infers programId from IDL.address
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const processedIdl: any = {
    ...rest,
    address: address || MERKLE_DISTRIBUTOR_PROGRAM_ID.toString()
  }
  
  // If IDL already has correct structure, just clean accounts
  if (rest.version && rest.name && rest.instructions) {
    return cleanIdlAccounts(processedIdl) as Idl
  }

  // Process instructions to clean account addresses
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const processedInstructions = (rest.instructions || []).map((instruction: any) => {
    if (!instruction.accounts) return instruction
    
    return {
      ...instruction,
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      accounts: instruction.accounts.map((account: any) => cleanAccount(account, instruction.name))
    }
  })

  // Process accounts - ensure each account has a type field
  // This is critical for Anchor to calculate account sizes
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const processedAccounts = (rest.accounts || []).map((account: any) => {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const processed: any = { name: account.name }
    if (account.discriminator) processed.discriminator = account.discriminator
    
    // Ensure type field is present - Anchor needs this to calculate account size
    if (account.type) {
      processed.type = account.type
    } else {
      // Try to find type from types array
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const accountType = (rest.types || []).find((t: any) => t.name === account.name)
      if (accountType?.type) {
        processed.type = accountType.type
      }
    }
    return processed
  })
  
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const idl: any = {
    address: address || MERKLE_DISTRIBUTOR_PROGRAM_ID.toString(), // Required in Anchor 0.31.0+
    version: metadata?.version || '0.1.0',
    name: metadata?.name || 'merkle_distributor',
    instructions: processedInstructions,
    accounts: processedAccounts,
    types: rest.types || [],
    errors: rest.errors || [],
  }

  return cleanIdlAccounts(idl) as Idl
}

/**
 * Clean IDL accounts to ensure proper format
 */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
function cleanIdlAccounts(idl: any): any {
  if (!idl || !idl.instructions) return idl

  const cleaned = JSON.parse(JSON.stringify(idl))
  
  // Ensure address field exists for Anchor 0.31.0+
  if (!cleaned.address) {
    cleaned.address = MERKLE_DISTRIBUTOR_PROGRAM_ID.toString()
  }
  
  // Ensure accounts array has type fields - critical for Anchor to calculate account sizes
  if (cleaned.accounts && Array.isArray(cleaned.accounts) && cleaned.accounts.length > 0) {
    // Process existing accounts array
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    cleaned.accounts = cleaned.accounts.map((account: any) => {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const processed: any = { name: account.name }
      if (account.discriminator) processed.discriminator = account.discriminator
      
      // Ensure type field is present - CRITICAL for Anchor to calculate account size
      if (account.type && account.type.kind) {
        // If type already exists and has correct structure, use it
        processed.type = JSON.parse(JSON.stringify(account.type))
      } else {
        // Try to find type from types array
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const accountType = (cleaned.types || []).find((t: any) => t.name === account.name)
        if (accountType?.type && accountType.type.kind) {
          // Copy the entire type object from types array
          processed.type = JSON.parse(JSON.stringify(accountType.type))
        }
      }
      return processed
    })
  } else if (!cleaned.accounts || (Array.isArray(cleaned.accounts) && cleaned.accounts.length === 0)) {
    // If accounts array is missing or empty, create it from types array
    if (cleaned.types && Array.isArray(cleaned.types)) {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      cleaned.accounts = cleaned.types
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        .filter((t: any) => t.type?.kind === 'struct') // Only struct types are accounts
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        .map((t: any) => ({
          name: t.name,
          type: JSON.parse(JSON.stringify(t.type)), // Deep copy the type object
          discriminator: t.discriminator
        }))
    }
  }
  
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  cleaned.instructions = cleaned.instructions.map((instruction: any) => {
    if (!instruction.accounts) return instruction
    
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const cleanedAccounts = instruction.accounts.map((account: any) => cleanAccount(account, instruction.name || 'unknown'))
    
    return {
      ...instruction,
      accounts: cleanedAccounts
    }
  })

  return cleaned
}

/**
 * Clean a single account object
 */
// eslint-disable-next-line @typescript-eslint/no-explicit-any, @typescript-eslint/no-unused-vars
function cleanAccount(account: any, _instructionName: string): any {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const clean: any = { name: account.name }
  
  // Copy valid boolean fields
  if (account.writable === true || account.writable === false) {
    clean.writable = account.writable
  }
  if (account.signer === true || account.signer === false) {
    clean.signer = account.signer
  }
  if (account.optional === true || account.optional === false) {
    clean.optional = account.optional
  }
  
  // Handle PDA - if exists, don't include address
  if (account.pda && typeof account.pda === 'object') {
    clean.pda = account.pda
    // CRITICAL: Do not include address if PDA exists
    return clean
  }
  
  // Handle address - only if valid string and no PDA
  // IMPORTANT: Only include address if it's a valid PublicKey string
  // Remove address if it's null, undefined, empty, or invalid
  if (account.address) {
    if (typeof account.address === 'string' && account.address.length > 0) {
      try {
        // Validate it's a valid PublicKey
        new PublicKey(account.address)
        clean.address = account.address
      } catch {
        // Invalid address - do NOT include it
      }
    } else if (Array.isArray(account.address) && account.address.length > 0) {
      try {
        const addressBytes = new Uint8Array(account.address)
        const addressPubkey = new PublicKey(addressBytes)
        clean.address = addressPubkey.toString()
      } catch {
        // Invalid address - do NOT include it
      }
    }
  }
  // If no address or invalid address, don't include it - Anchor will handle it
  
  return clean
}

/**
 * Create Program instance from IDL
 */
function createProgramInstance(idl: Idl, provider: AnchorProvider): Program<Idl> | null {
  try {
    // In Anchor 0.31.0+, the Program constructor format changed:
    // new Program<MyProgram>(idl, provider) instead of new Program(idl, programId, provider)
    // The programId is now inferred from the IDL's address field
    return new Program(idl, provider)
  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : String(error)
    console.error('Failed to create Program:', errorMessage)
    return null
  }
}

/**
 * Hook to get Merkle Distributor Program instance
 */
export function useMerkleDistributorProgram() {
  const { connection } = useConnection()
  const wallet = useWallet()
  const [idl, setIdl] = useState<Idl | null>(null)
  const [program, setProgram] = useState<Program<Idl> | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  // Load local IDL on mount
  useEffect(() => {
    loadIdl().then((loadedIdl) => {
      if (loadedIdl) {
        setIdl(loadedIdl)
      } else {
        setError('Failed to load IDL')
        setIsLoading(false)
      }
    })
  }, [])

  // Create Program when IDL, connection, and wallet are ready
  useEffect(() => {
    if (!wallet.publicKey || !connection || !idl) {
      if (!wallet.publicKey || !connection) {
        setProgram(null)
        setIsLoading(false)
        setError(null)
      }
      return
    }

    setIsLoading(true)
    setError(null)

    const provider = new AnchorProvider(
      connection,
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      wallet as any,
      AnchorProvider.defaultOptions()
    )

    // Try to fetch IDL from chain first (preferred method)
    Program.fetchIdl(MERKLE_DISTRIBUTOR_PROGRAM_ID, provider)
      .then((fetchedIdl) => {
        if (fetchedIdl) {
          const cleanedFetchedIdl = cleanIdlAccounts(fetchedIdl) as Idl
          const programInstance = createProgramInstance(cleanedFetchedIdl, provider)
          if (programInstance) {
            setProgram(programInstance)
            setIsLoading(false)
            setError(null)
          } else {
            tryLocalIdl(idl, provider)
          }
        } else {
          tryLocalIdl(idl, provider)
        }
      })
      .catch(() => {
        tryLocalIdl(idl, provider)
      })

    function tryLocalIdl(localIdl: Idl, provider: AnchorProvider) {
      const cleanedIdl = cleanIdlAccounts(localIdl) as Idl
      const programInstance = createProgramInstance(cleanedIdl, provider)
      if (programInstance) {
        setProgram(programInstance)
        setIsLoading(false)
        setError(null)
      } else {
        setProgram(null)
        setIsLoading(false)
        setError('Failed to create Program. Please check the console for errors.')
      }
    }
  }, [connection, wallet, idl])

  return { program, isLoading, error }
}

/**
 * Get Config PDA
 */
export function getConfigPDA(programId: PublicKey = MERKLE_DISTRIBUTOR_PROGRAM_ID): [PublicKey, number] {
  return PublicKey.findProgramAddressSync([Buffer.from('DistributorConfig')], programId)
}

/**
 * Get ClaimedRewards PDA
 */
export function getClaimedRewardsPDA(
  claimant: PublicKey,
  programId: PublicKey = MERKLE_DISTRIBUTOR_PROGRAM_ID
): [PublicKey, number] {
  return PublicKey.findProgramAddressSync(
    [Buffer.from('ClaimedRewards'), claimant.toBuffer()],
    programId
  )
}
