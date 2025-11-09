'use client'

import { useState } from 'react'
import { PublicKey } from '@solana/web3.js'
import { useWallet, useConnection } from '@solana/wallet-adapter-react'
import { getAssociatedTokenAddress } from '@solana/spl-token'
import { useMerkleDistributorProgram, getConfigPDA } from '@/lib/program'
import { DEPLOYMENT_CONFIG } from '@/lib/config'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { toast } from 'sonner'

export function InitializeDistributor() {
  const { publicKey } = useWallet()
  const { connection } = useConnection()
  const { program, isLoading: programLoading, error: programError } = useMerkleDistributorProgram()
  const queryClient = useQueryClient()
  const [mintAddress, setMintAddress] = useState(DEPLOYMENT_CONFIG.MINT_ADDRESS.toString())

  const [configPDA] = getConfigPDA()

  const initializeMutation = useMutation({
    mutationFn: async () => {
      if (!publicKey) {
        throw new Error('Wallet not connected. Please connect your wallet.')
      }
      
      if (!program) {
        throw new Error('Program not loaded. Please wait a moment and try again.')
      }

      if (!mintAddress) {
        throw new Error('Please enter a mint address')
      }

      const mint = new PublicKey(mintAddress)
      const tokenVault = await getAssociatedTokenAddress(mint, configPDA, true)

      // Try to get program data (optional)
      const programDataAddress = PublicKey.findProgramAddressSync(
        [program.programId.toBuffer()],
        new PublicKey('BPFLoaderUpgradeab1e11111111111111111111111')
      )[0]

      let programData: PublicKey | null = null
      try {
        const accountInfo = await connection.getAccountInfo(programDataAddress)
        if (accountInfo) {
          programData = programDataAddress
        }
      } catch {
        // Program data doesn't exist, that's okay
      }

      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const accounts: any = {
        config: configPDA,
        mint: mint,
        tokenVault: tokenVault,
        admin: publicKey,
        programData: programData,
        program: program.programId,
        associatedTokenProgram: new PublicKey('ATokenGPvbdGVxr1b2hvZbsiqW5xWH25efTNsLJA8knL'),
        tokenProgram: new PublicKey('TokenkegQfeZyiNwAJbNbGKPFXCWuBvf9Ss623VQ5DA'),
        systemProgram: PublicKey.default,
      }

      const tx = await program.methods
        .initialize()
        .accounts(accounts)
        .rpc()

      return tx
    },
    onSuccess: (tx) => {
      toast.success('Distributor initialized!', {
        description: `Transaction: ${tx}`,
      })
      queryClient.invalidateQueries({ queryKey: ['distributor-config'] })
      setMintAddress('')
    },
    onError: (error: unknown) => {
      const errorMessage = error instanceof Error ? error.message : String(error)
      toast.error('Failed to initialize distributor', {
        description: errorMessage,
      })
    },
  })

  if (!publicKey) {
    return (
      <Alert>
        <AlertDescription>Please connect your wallet to initialize the distributor</AlertDescription>
      </Alert>
    )
  }

  if (programLoading) {
    return (
      <Alert>
        <AlertDescription>
          <p>Loading program...</p>
          <p className="text-xs text-muted-foreground mt-1">
            Please wait while the program is being loaded. This may take a few seconds.
          </p>
        </AlertDescription>
      </Alert>
    )
  }

  if (programError) {
    return (
      <Alert variant="destructive">
        <AlertDescription>
          <p className="font-semibold">Failed to load program</p>
          <p className="text-sm mt-1">{programError}</p>
          <p className="text-xs text-muted-foreground mt-2">
            Please check the browser console for more details. The program may not be properly deployed or the IDL may be invalid.
          </p>
        </AlertDescription>
      </Alert>
    )
  }

  if (!program) {
    return (
      <Alert>
        <AlertDescription>
          <p>Program not available</p>
          <p className="text-xs text-muted-foreground mt-1">
            The program could not be loaded. Please check your wallet connection and try again.
          </p>
        </AlertDescription>
      </Alert>
    )
  }

  return (
    <div className="p-4 border rounded-lg space-y-4">
      <h3 className="text-lg font-semibold">Initialize Distributor</h3>
      <Alert>
        <AlertDescription>
          <p className="text-sm">
            <strong>Deployed Mint:</strong> {DEPLOYMENT_CONFIG.MINT_ADDRESS.toString()}
          </p>
          <p className="text-xs text-muted-foreground mt-1">
            The deployed mint address is pre-filled. You can change it if needed.
          </p>
        </AlertDescription>
      </Alert>
      <div className="space-y-2">
        <Label htmlFor="mint">Mint Address</Label>
        <Input
          id="mint"
          placeholder="Enter SPL Token mint address"
          value={mintAddress}
          onChange={(e) => setMintAddress(e.target.value)}
          disabled={initializeMutation.isPending}
        />
        <p className="text-xs text-muted-foreground">
          Current deployed mint: {DEPLOYMENT_CONFIG.MINT_ADDRESS.toString()}
        </p>
      </div>
      <Button
        onClick={() => initializeMutation.mutate()}
        disabled={initializeMutation.isPending || !mintAddress}
        className="w-full"
      >
        {initializeMutation.isPending ? 'Initializing...' : 'Initialize Distributor'}
      </Button>
    </div>
  )
}

