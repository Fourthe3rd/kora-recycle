export enum AccountStatus {
    NEW = 'NEW',
    SAFE_TO_REAP = 'SAFE',
    UNSAFE = 'UNSAFE',
    PENDING_RECLAIM = 'PENDING',
    RECLAIMED = 'RECLAIMED'
}

export interface SponsoredAccount {
    address: string;
    programOwner: string;
    rentLamports: bigint;
    creationSlot: number;
    closeAuthority: string | null;
    status: AccountStatus;
    updatedAt: number;
}

export interface ReclamationCandidate {
    account: SponsoredAccount;
    priorityFee: number;
}