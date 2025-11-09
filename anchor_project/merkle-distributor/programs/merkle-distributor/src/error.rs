use anchor_lang::error_code;

#[error_code]
pub enum ErrorCode {
    #[msg("Rewards were already claimed")]
    AlreadyClaimed,
    #[msg("Not enough token balance to pay rewards")]
    InsufficientBalance,
    #[msg("Invalid Merkle proof")]
    InvalidProof,
    #[msg("Account is not authorized to execute this instruction")]
    Unauthorized,
    #[msg("New and old stored values are identical")]
    SameValue,
    #[msg("Distribution was shutdown")]
    Shutdown,
}
