use anchor_lang::{
    prelude::*,
    solana_program::hash::{hashv, HASH_BYTES},
    system_program::System,
    Accounts, Result,
};
use anchor_spl::token::Mint;
use anchor_spl::{
    associated_token::AssociatedToken,
    token,
    token::{Token, TokenAccount},
};

use crate::error::ErrorCode;
use crate::state::{claimed_rewards::ClaimedRewards, distributor_config::DistributorConfig};

#[derive(Accounts)]
pub struct Claim<'info> {
    #[account(
        seeds = [DistributorConfig::SEED.as_ref()],
        bump,
    )]
    pub config: Account<'info, DistributorConfig>,

    pub mint: Account<'info, Mint>,

    #[account(
        init_if_needed,
        payer = claimant,
        seeds = [ClaimedRewards::SEED.as_ref(), claimant.key().to_bytes().as_ref()],
        bump,
        space = 8 + ClaimedRewards::LEN
    )]
    pub claimed_rewards: Account<'info, ClaimedRewards>,

    #[account(
        mut,
        associated_token::mint = mint,
        associated_token::authority = config.key(),
        address = config.token_vault,
    )]
    pub from: Account<'info, TokenAccount>,

    #[account(
        init_if_needed,
        payer = claimant,
        associated_token::mint = mint,
        associated_token::authority = claimant,
    )]
    pub to: Account<'info, TokenAccount>,

    #[account(mut)]
    pub claimant: Signer<'info>,

    pub token_program: Program<'info, Token>,
    pub associated_token_program: Program<'info, AssociatedToken>,
    pub system_program: Program<'info, System>,
}

impl<'info> Claim<'info> {
    pub fn handle_claim(&mut self, total_amount: u64, proof: Vec<[u8; HASH_BYTES]>) -> Result<()> {
        require!(!self.config.shutdown, ErrorCode::Shutdown);

        let already_claimed = self.claimed_rewards.claimed;

        require_gt!(total_amount, already_claimed, ErrorCode::AlreadyClaimed);

        let input = hashv(&[&self.claimant.key.to_bytes(), &total_amount.to_be_bytes()]);
        require!(
            self.verify_proof(input.to_bytes(), &proof),
            ErrorCode::InvalidProof
        );

        let amount = total_amount - already_claimed;
        require_gte!(self.from.amount, amount, ErrorCode::InsufficientBalance);

        self.claimed_rewards.claimed = total_amount;

        let seeds = [DistributorConfig::SEED.as_ref(), &[self.config.bump]];
        token::transfer(
            CpiContext::new(
                self.token_program.to_account_info(),
                token::Transfer {
                    from: self.from.to_account_info(),
                    to: self.to.to_account_info(),
                    authority: self.config.to_account_info(),
                },
            )
            .with_signer(&[&seeds[..]]),
            amount,
        )
    }

    fn verify_proof(&self, input: [u8; HASH_BYTES], proof: &[[u8; HASH_BYTES]]) -> bool {
        let double_hashing = hashv(&[&input]).to_bytes();
        proof.iter().fold(double_hashing, |acc, sibling| {
            if acc <= *sibling {
                hashv(&[&acc, sibling]).to_bytes()
            } else {
                hashv(&[sibling, &acc]).to_bytes()
            }
        }) == self.config.root
    }
}
