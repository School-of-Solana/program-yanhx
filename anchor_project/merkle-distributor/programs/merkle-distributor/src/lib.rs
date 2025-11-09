use anchor_lang::prelude::*;
use anchor_lang::solana_program::hash::HASH_BYTES;

use instructions::*;

mod error;
mod instructions;
mod state;

declare_id!("8LxW6m2hQymvR5hxvDC68P6Qfk5muvFv7ttnDgYSQGzb");

#[program]
pub mod merkle_distributor {
    use super::*;

    pub fn initialize(ctx: Context<Initialize>) -> Result<()> {
        handle_initialize(ctx)
    }

    pub fn claim(
        ctx: Context<Claim>,
        total_amount: u64,
        proof: Vec<[u8; HASH_BYTES]>,
    ) -> Result<()> {
        ctx.accounts.handle_claim(total_amount, proof)
    }

    pub fn update_root(ctx: Context<UpdateRoot>, new_root: [u8; HASH_BYTES]) -> Result<()> {
        ctx.accounts.handle_update_root(new_root)
    }

    pub fn set_admin(ctx: Context<SetAdmin>, new_admin: Pubkey) -> Result<()> {
        ctx.accounts.handle_set_admin(new_admin)
    }

    pub fn shutdown(ctx: Context<Shutdown>) -> Result<()> {
        ctx.accounts.handle_shutdown()
    }
}
