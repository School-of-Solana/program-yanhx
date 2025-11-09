'use client'

import { DistributorStatus } from './distributor-status'
import { InitializeDistributor } from './initialize-distributor'
import { UpdateRoot } from './update-root'
import { ClaimTokens } from './claim-tokens'
import { useWallet } from '@solana/wallet-adapter-react'
import { useQuery } from '@tanstack/react-query'
import { useMerkleDistributorProgram, getConfigPDA } from '@/lib/program'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'

export function MerkleDistributorFeature() {
  const { publicKey } = useWallet()
  const { program } = useMerkleDistributorProgram()
  const [configPDA] = getConfigPDA()

  const { data: config } = useQuery({
    queryKey: ['distributor-config', configPDA.toString()],
    queryFn: async () => {
      if (!program) return null
      try {
        // @ts-expect-error - Anchor IDL types are dynamic
        const account = await program.account.distributorConfig.fetch(configPDA)
        return {
          admin: account.admin.toString(),
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

  const isAdmin = publicKey && config && publicKey.toString() === config.admin

  return (
    <div className="max-w-6xl mx-auto py-6 sm:px-6 lg:px-8 space-y-6">
      <div className="text-center space-y-2">
        <h1 className="text-3xl font-bold">Merkle Distributor</h1>
        <p className="text-muted-foreground">
          A Solana program for distributing SPL tokens using Merkle tree proofs
        </p>
      </div>

      <DistributorStatus />

      <Tabs defaultValue="claim" className="w-full">
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="claim">Claim Tokens</TabsTrigger>
          {isAdmin && <TabsTrigger value="admin">Admin</TabsTrigger>}
          <TabsTrigger value="initialize">Initialize</TabsTrigger>
        </TabsList>

        <TabsContent value="claim" className="mt-4">
          <ClaimTokens />
        </TabsContent>

        {isAdmin && (
          <TabsContent value="admin" className="mt-4">
            <div className="space-y-4">
              <UpdateRoot />
            </div>
          </TabsContent>
        )}

        <TabsContent value="initialize" className="mt-4">
          <InitializeDistributor />
        </TabsContent>
      </Tabs>
    </div>
  )
}

