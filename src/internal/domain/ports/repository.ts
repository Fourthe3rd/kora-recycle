import { SponsoredAccount, AccountStatus } from "../model/account";

export interface LedgerRepository {
    upsertAccount(account: SponsoredAccount): Promise<void>;
    getAccountsByStatus(status: AccountStatus, limit: number): Promise<SponsoredAccount[]>;
    updateStatus(address: string, status: AccountStatus): Promise<void>;
    getLastScannedSignature(): Promise<string | null>;
    saveLastScannedSignature(signature: string): Promise<void>;
}