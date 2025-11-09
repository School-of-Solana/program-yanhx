'use client'

import { useState } from 'react'
import { PublicKey } from '@solana/web3.js'
import { BN } from '@coral-xyz/anchor'
import { useWallet } from '@solana/wallet-adapter-react'
import { useMerkleDistributorProgram, getConfigPDA } from '@/lib/program'
import { getMerkleRoot, Leaf } from '@/lib/merkle-utils'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { toast } from 'sonner'

export function UpdateRoot() {
  const { publicKey } = useWallet()
  const { program } = useMerkleDistributorProgram()
  const queryClient = useQueryClient()
  const [claimantAddress, setClaimantAddress] = useState('')
  const [amount, setAmount] = useState('')
  const [leaves, setLeaves] = useState<Leaf[]>([])

  const [configPDA] = getConfigPDA()

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
    onError: (error: any) => {
      toast.error('Failed to add leaf', {
        description: error.message,
      })
    },
  })

  const updateRootMutation = useMutation({
    mutationFn: async () => {
      if (!program || !publicKey) {
        throw new Error('Wallet not connected')
      }

      if (leaves.length === 0) {
        throw new Error('Please add at least one leaf')
      }

      const root = getMerkleRoot(leaves)
      const rootArray = Array.from(root)

      const tx = await program.methods
        .updateRoot(rootArray)
        .accounts({
          config: configPDA,
          admin: publicKey,
        } as any)
        .rpc()

      return tx
    },
    onSuccess: (tx) => {
      toast.success('Merkle root updated!', {
        description: `Transaction: ${tx}`,
      })
      queryClient.invalidateQueries({ queryKey: ['distributor-config'] })
      setLeaves([])
    },
    onError: (error: any) => {
      toast.error('Failed to update root', {
        description: error.message,
      })
    },
  })

  if (!publicKey) {
    return (
      <Alert>
        <AlertDescription>Please connect your wallet to update the Merkle root</AlertDescription>
      </Alert>
    )
  }

  return (
    <div className="p-4 border rounded-lg space-y-4">
      <h3 className="text-lg font-semibold">Update Merkle Root</h3>

      <div className="space-y-2">
        <Label htmlFor="claimant">Claimant Address</Label>
        <Input
          id="claimant"
          placeholder="Enter claimant public key"
          value={claimantAddress}
          onChange={(e) => setClaimantAddress(e.target.value)}
        />
      </div>

      <div className="space-y-2">
        <Label htmlFor="amount">Amount</Label>
        <Input
          id="amount"
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
          <Button
            onClick={() => updateRootMutation.mutate()}
            disabled={updateRootMutation.isPending}
            className="w-full"
          >
            {updateRootMutation.isPending ? 'Updating...' : 'Update Root'}
          </Button>
        </div>
      )}
    </div>
  )
}

