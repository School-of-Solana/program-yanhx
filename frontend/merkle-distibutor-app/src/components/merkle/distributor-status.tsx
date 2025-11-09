'use client'

import { useQuery } from '@tanstack/react-query'
import { PublicKey } from '@solana/web3.js'
import { useConnection } from '@solana/wallet-adapter-react'
import { useMerkleDistributorProgram, getConfigPDA } from '@/lib/program'
import { DEPLOYMENT_CONFIG } from '@/lib/config'
import { Button } from '@/components/ui/button'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { ellipsify } from '@/lib/utils'

export function DistributorStatus() {
  const { connection } = useConnection()
  const { program } = useMerkleDistributorProgram()
  const [configPDA] = getConfigPDA()

  const { data: config, isLoading, error, refetch } = useQuery({
    queryKey: ['distributor-config', configPDA.toString()],
    queryFn: async () => {
      if (!program) throw new Error('Program not initialized')
      try {
        const account = await program.account.distributorConfig.fetch(configPDA)
        return {
          bump: account.bump,
          root: account.root,
          mint: account.mint.toString(),
          tokenVault: account.tokenVault.toString(),
          admin: account.admin.toString(),
          shutdown: account.shutdown,
        }
      } catch (err: any) {
        if (err.message?.includes('Account does not exist')) {
          return null
        }
        throw err
      }
    },
    enabled: !!program,
    refetchInterval: 5000,
  })

  const { data: vaultBalance } = useQuery({
    queryKey: ['vault-balance', config?.tokenVault],
    queryFn: async () => {
      if (!config?.tokenVault) return null
      const tokenAccount = await connection.getTokenAccountBalance(new PublicKey(config.tokenVault))
      return tokenAccount.value.uiAmount
    },
    enabled: !!config?.tokenVault,
    refetchInterval: 5000,
  })

  if (isLoading) {
    return (
      <div className="p-4 border rounded-lg">
        <p className="text-sm text-muted-foreground">Loading distributor status...</p>
      </div>
    )
  }

  if (error) {
    return (
      <Alert variant="destructive">
        <AlertDescription>Error loading distributor: {error.message}</AlertDescription>
      </Alert>
    )
  }

  if (!config) {
    return (
      <div className="p-4 border rounded-lg">
        <p className="text-sm text-muted-foreground">Distributor not initialized</p>
      </div>
    )
  }

  const rootHex = Buffer.from(config.root).toString('hex')

  return (
    <div className="p-4 border rounded-lg space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-semibold">Distributor Status</h3>
        <Button variant="outline" size="sm" onClick={() => refetch()}>
          Refresh
        </Button>
      </div>

      {config.shutdown && (
        <Alert>
          <AlertDescription>⚠️ Distributor is shut down</AlertDescription>
        </Alert>
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
        <div>
          <p className="text-muted-foreground">Admin</p>
          <p className="font-mono">{ellipsify(config.admin)}</p>
          {config.admin === DEPLOYMENT_CONFIG.ADMIN_WALLET.toString() && (
            <p className="text-xs text-green-600 mt-1">✓ Deployed Admin</p>
          )}
        </div>
        <div>
          <p className="text-muted-foreground">Mint</p>
          <p className="font-mono">{ellipsify(config.mint)}</p>
          {config.mint === DEPLOYMENT_CONFIG.MINT_ADDRESS.toString() && (
            <p className="text-xs text-green-600 mt-1">✓ Deployed Mint</p>
          )}
        </div>
        <div>
          <p className="text-muted-foreground">Token Vault</p>
          <p className="font-mono">{ellipsify(config.tokenVault)}</p>
          {config.tokenVault === DEPLOYMENT_CONFIG.TOKEN_VAULT.toString() && (
            <p className="text-xs text-green-600 mt-1">✓ Deployed Vault</p>
          )}
        </div>
        <div>
          <p className="text-muted-foreground">Vault Balance</p>
          <p className="font-mono">{vaultBalance?.toLocaleString() || 'Loading...'}</p>
        </div>
        <div className="md:col-span-2">
          <p className="text-muted-foreground">Merkle Root</p>
          <p className="font-mono text-xs break-all">{rootHex || 'Not set'}</p>
        </div>
        <div className="md:col-span-2 pt-2 border-t">
          <p className="text-xs text-muted-foreground">
            <strong>Deployment Info:</strong> Cluster: {DEPLOYMENT_CONFIG.CLUSTER} | 
            Program: {ellipsify(DEPLOYMENT_CONFIG.PROGRAM_ID.toString())}
          </p>
        </div>
      </div>
    </div>
  )
}

