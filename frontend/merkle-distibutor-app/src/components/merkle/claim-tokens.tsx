'use client'

import { useState } from 'react'
import { PublicKey } from '@solana/web3.js'
import { BN } from '@coral-xyz/anchor'
import { useWallet } from '@solana/wallet-adapter-react'
import { getAssociatedTokenAddress } from '@solana/spl-token'
import { useMerkleDistributorProgram, getConfigPDA, getClaimedRewardsPDA } from '@/lib/program'
import { getProofForClaimant, Leaf } from '@/lib/merkle-utils'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { toast } from 'sonner'

export function ClaimTokens() {
  const { publicKey } = useWallet()
  const { program } = useMerkleDistributorProgram()
  const queryClient = useQueryClient()
  const [claimantAddress, setClaimantAddress] = useState('')
  const [amount, setAmount] = useState('')
  const [leaves, setLeaves] = useState<Leaf[]>([])

  const [configPDA] = getConfigPDA()

  const { data: config } = useQuery({
    queryKey: ['distributor-config', configPDA.toString()],
    queryFn: async () => {
      if (!program) throw new Error('Program not initialized')
      try {
        // @ts-expect-error - Anchor IDL types are dynamic
        const account = await program.account.distributorConfig.fetch(configPDA)
        return {
          mint: account.mint.toString(),
          shutdown: account.shutdown,
        }
      } catch (err: unknown) {
        const error = err instanceof Error ? err : new Error(String(err))
        if (error.message?.includes('Account does not exist')) {
          return null
        }
        throw err
      }
    },
    enabled: !!program,
  })

  const addLeafMutation = useMutation({
    mutationFn: async () => {
      if (!claimantAddress || !amount) {
        throw new Error('Please enter both claimant address and amount')
      }

      const claimant = new PublicKey(claimantAddress)
      const amountBN = new BN(amount)

      const newLeaf: Leaf = { claimant, amount: amountBN }
      setLeaves([...leaves, newLeaf])
      setClaimantAddress('')
      setAmount('')

      return newLeaf
    },
    onSuccess: () => {
      toast.success('Leaf added to list')
    },
    onError: (error: unknown) => {
      const errorMessage = error instanceof Error ? error.message : String(error)
      toast.error('Failed to add leaf', {
        description: errorMessage,
      })
    },
  })

  const claimMutation = useMutation({
    mutationFn: async () => {
      if (!program || !publicKey) {
        throw new Error('Wallet not connected')
      }

      if (!config) {
        throw new Error('Distributor not initialized')
      }

      if (config.shutdown) {
        throw new Error('Distributor is shut down')
      }

      if (leaves.length === 0) {
        throw new Error('Please add at least one leaf to build the Merkle tree')
      }

      // Find proof for the connected wallet
      const proofData = getProofForClaimant(leaves, publicKey)
      if (!proofData) {
        throw new Error('Your wallet is not in the Merkle tree. Please add your address to the leaves list.')
      }

      const mint = new PublicKey(config.mint)
      const [claimedRewardsPDA] = getClaimedRewardsPDA(publicKey)
      const tokenVault = await getAssociatedTokenAddress(mint, configPDA, true)
      const recipientTokenAccount = await getAssociatedTokenAddress(mint, publicKey)

      const tx = await program.methods
        .claim(proofData.amount, proofData.proof)
        .accounts({
          config: configPDA,
          mint: mint,
          claimedRewards: claimedRewardsPDA,
          from: tokenVault,
          to: recipientTokenAccount,
          claimant: publicKey,
          tokenProgram: new PublicKey('TokenkegQfeZyiNwAJbNbGKPFXCWuBvf9Ss623VQ5DA'),
          associatedTokenProgram: new PublicKey('ATokenGPvbdGVxr1b2hvZbsiqW5xWH25efTNsLJA8knL'),
          systemProgram: PublicKey.default,
        })
        .rpc()

      return tx
    },
    onSuccess: (tx) => {
      toast.success('Tokens claimed successfully!', {
        description: `Transaction: ${tx}`,
      })
      queryClient.invalidateQueries({ queryKey: ['distributor-config'] })
      queryClient.invalidateQueries({ queryKey: ['vault-balance'] })
    },
    onError: (error: unknown) => {
      const errorMessage = error instanceof Error ? error.message : String(error)
      toast.error('Failed to claim tokens', {
        description: errorMessage,
      })
    },
  })

  if (!publicKey) {
    return (
      <Alert>
        <AlertDescription>Please connect your wallet to claim tokens</AlertDescription>
      </Alert>
    )
  }

  if (!config) {
    return (
      <Alert>
        <AlertDescription>Distributor not initialized</AlertDescription>
      </Alert>
    )
  }

  if (config.shutdown) {
    return (
      <Alert variant="destructive">
        <AlertDescription>Distributor is shut down</AlertDescription>
      </Alert>
    )
  }

  const canClaim = getProofForClaimant(leaves, publicKey) !== null

  return (
    <div className="p-4 border rounded-lg space-y-4">
      <h3 className="text-lg font-semibold">Claim Tokens</h3>
      <p className="text-sm text-muted-foreground">
        Add leaves to build the Merkle tree, then claim if your wallet is eligible
      </p>

      <div className="space-y-2">
        <Label htmlFor="claimant-claim">Claimant Address</Label>
        <Input
          id="claimant-claim"
          placeholder="Enter claimant public key"
          value={claimantAddress}
          onChange={(e) => setClaimantAddress(e.target.value)}
        />
      </div>

      <div className="space-y-2">
        <Label htmlFor="amount-claim">Amount</Label>
        <Input
          id="amount-claim"
          type="number"
          placeholder="Enter amount"
          value={amount}
          onChange={(e) => setAmount(e.target.value)}
        />
      </div>

      <Button onClick={() => addLeafMutation.mutate()} disabled={!claimantAddress || !amount} className="w-full">
        Add Leaf
      </Button>

      {leaves.length > 0 && (
        <div className="space-y-2">
          <Label>Leaves ({leaves.length})</Label>
          <div className="max-h-40 overflow-y-auto space-y-1 p-2 border rounded">
            {leaves.map((leaf, index) => (
              <div key={index} className="text-sm">
                <p className="font-mono text-xs">
                  {leaf.claimant.toString().slice(0, 8)}... - {leaf.amount.toString()}
                </p>
              </div>
            ))}
          </div>

          {canClaim ? (
            <Alert>
              <AlertDescription>✓ Your wallet is eligible to claim!</AlertDescription>
            </Alert>
          ) : (
            <Alert variant="destructive">
              <AlertDescription>Your wallet is not in the Merkle tree</AlertDescription>
            </Alert>
          )}

          <Button
            onClick={() => claimMutation.mutate()}
            disabled={claimMutation.isPending || !canClaim}
            className="w-full"
          >
            {claimMutation.isPending ? 'Claiming...' : 'Claim Tokens'}
          </Button>
        </div>
      )}
    </div>
  )
}

