use anchor_lang::{
    account,
    prelude::{Pubkey, *},
};

#[account]
#[derive(Default, Debug)]
pub struct ClaimedRewards {
    pub bump: u8,
    pub claimed: u64,
}

impl ClaimedRewards {
    pub const LEN: usize = 8 + std::mem::size_of::<ClaimedRewards>();
    pub const SEED: &'static [u8; 14] = b"ClaimedRewards";
}
