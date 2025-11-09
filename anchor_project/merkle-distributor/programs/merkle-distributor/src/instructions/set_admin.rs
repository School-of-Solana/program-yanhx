use anchor_lang::{prelude::*, Accounts, Key, Result};

use crate::error::ErrorCode;
use crate::state::distributor_config::DistributorConfig;

#[derive(Accounts)]
pub struct SetAdmin<'info> {
    #[account(
        mut,
        seeds = [DistributorConfig::SEED.as_ref()],
        bump = config.bump,
    )]
    pub config: Account<'info, DistributorConfig>,

    #[account(mut, address = config.admin @ ErrorCode::Unauthorized)]
    pub admin: Signer<'info>,
}

impl<'info> SetAdmin<'info> {
    pub fn handle_set_admin(&mut self, new_admin: Pubkey) -> Result<()> {
        require_keys_neq!(self.admin.key(), new_admin, ErrorCode::SameValue);

        self.config.admin = new_admin;

        Ok(())
    }
}
