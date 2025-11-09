import { PublicKey } from '@solana/web3.js'
// @ts-ignore - Anchor types may not be available during build
import { BN } from '@coral-xyz/anchor'
import { sha256 } from 'js-sha256'

export interface Leaf {
  claimant: PublicKey
  amount: BN
}

// Hash function matching Solana's hashv
// Solana uses SHA-256 for hashing
function hash(data: Uint8Array): Uint8Array {
  const hashBytes = sha256.arrayBuffer(data)
  return new Uint8Array(hashBytes)
}

// Hashv function matching Solana's hashv(&[&data1, &data2, ...])
function hashv(dataArray: Uint8Array[]): Uint8Array {
  // Concatenate all data arrays
  let totalLength = 0
  for (const data of dataArray) {
    totalLength += data.length
  }
  const combined = new Uint8Array(totalLength)
  let offset = 0
  for (const data of dataArray) {
    combined.set(data, offset)
    offset += data.length
  }
  return hash(combined)
}

function compareUint8Array(a: Uint8Array, b: Uint8Array): number {
  for (let i = 0; i < Math.min(a.length, b.length); i++) {
    if (a[i] < b[i]) return -1
    if (a[i] > b[i]) return 1
  }
  return a.length - b.length
}

function hashPair(left: Uint8Array, right: Uint8Array): Uint8Array {
  // Match Rust: hashv(&[&acc, sibling]) or hashv(&[sibling, &acc]) based on comparison
  if (compareUint8Array(left, right) <= 0) {
    return hashv([left, right])
  } else {
    return hashv([right, left])
  }
}

export function createLeaf(claimant: PublicKey, amount: BN): Uint8Array {
  // Match Rust: hashv(&[&self.claimant.key.to_bytes(), &total_amount.to_be_bytes()])
  const claimantBytes = claimant.toBuffer()
  const amountBytes = new Uint8Array(8)
  const amountBigInt = BigInt(amount.toString())
  // Convert to big-endian bytes (to_be_bytes in Rust)
  for (let i = 0; i < 8; i++) {
    amountBytes[7 - i] = Number((amountBigInt >> BigInt(i * 8)) & BigInt(0xff))
  }
  
  // First hash: hashv(&[&claimant_bytes, &amount_bytes])
  const input = hashv([claimantBytes, amountBytes])
  
  // Double hash: hashv(&[&input]) - matching Rust's verify_proof
  return hashv([input])
}

export function buildMerkleTree(leaves: Uint8Array[]): Uint8Array[][] {
  if (leaves.length === 0) return []
  if (leaves.length === 1) return [leaves]

  const tree: Uint8Array[][] = [leaves]
  let currentLevel = leaves

  while (currentLevel.length > 1) {
    const nextLevel: Uint8Array[] = []
    for (let i = 0; i < currentLevel.length; i += 2) {
      if (i + 1 < currentLevel.length) {
        nextLevel.push(hashPair(currentLevel[i], currentLevel[i + 1]))
      } else {
        nextLevel.push(currentLevel[i])
      }
    }
    tree.push(nextLevel)
    currentLevel = nextLevel
  }

  return tree
}

export function getProof(tree: Uint8Array[][], leafIndex: number): Uint8Array[] {
  const proof: Uint8Array[] = []
  let index = leafIndex

  for (let level = 0; level < tree.length - 1; level++) {
    const isLeft = index % 2 === 0
    const siblingIndex = isLeft ? index + 1 : index - 1

    if (siblingIndex < tree[level].length) {
      proof.push(tree[level][siblingIndex])
    }

    index = Math.floor(index / 2)
  }

  return proof
}

export function bufferToArray32(buffer: Uint8Array): number[] {
  if (buffer.length !== 32) {
    throw new Error('Buffer must be 32 bytes')
  }
  return Array.from(buffer)
}

export function getMerkleRoot(leaves: Leaf[]): Uint8Array {
  const leafBuffers = leaves.map((leaf) => createLeaf(leaf.claimant, leaf.amount))
  const tree = buildMerkleTree(leafBuffers)
  return tree[tree.length - 1][0]
}

export function getProofForClaimant(leaves: Leaf[], claimant: PublicKey): { proof: number[][]; amount: BN } | null {
  const leafIndex = leaves.findIndex((leaf) => leaf.claimant.equals(claimant))
  if (leafIndex === -1) return null

  const leafBuffers = leaves.map((leaf) => createLeaf(leaf.claimant, leaf.amount))
  const tree = buildMerkleTree(leafBuffers)
  const proof = getProof(tree, leafIndex)
  const proofArray = proof.map((p) => bufferToArray32(p))

  return {
    proof: proofArray,
    amount: leaves[leafIndex].amount,
  }
}

