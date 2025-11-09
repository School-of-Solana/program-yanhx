use anchor_lang::{
    account,
    prelude::{Pubkey, *},
    solana_program::hash::HASH_BYTES,
};

#[account]
#[derive(Default, Debug)]
pub struct DistributorConfig {
    pub bump: u8,
    pub root: [u8; HASH_BYTES],
    pub mint: Pubkey,
    pub token_vault: Pubkey,
    pub admin: Pubkey,
    pub shutdown: bool,
}

impl DistributorConfig {
    pub const LEN: usize = 8 + std::mem::size_of::<DistributorConfig>();
    pub const SEED: &'static [u8; 17] = b"DistributorConfig";
}
