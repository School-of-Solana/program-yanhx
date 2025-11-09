use anchor_lang::solana_program::hash::HASH_BYTES;
use anchor_lang::{prelude::*, Accounts, Key, Result};

use crate::error::ErrorCode;
use crate::state::distributor_config::DistributorConfig;

#[derive(Accounts)]
pub struct UpdateRoot<'info> {
    #[account(
        mut,
        seeds = [DistributorConfig::SEED.as_ref()],
        bump = config.bump,
    )]
    pub config: Account<'info, DistributorConfig>,

    #[account(mut, address = config.admin @ ErrorCode::Unauthorized)]
    pub admin: Signer<'info>,
}

impl<'info> UpdateRoot<'info> {
    pub fn handle_update_root(&mut self, new_root: [u8; HASH_BYTES]) -> Result<()> {
        require!(self.config.root != new_root, ErrorCode::SameValue);

        self.config.root = new_root;

        Ok(())
    }
}
