import { Connection, PublicKey, ParsedTransactionWithMeta } from '@solana/web3.js';
import { LedgerRepository } from '../../domain/ports/repository';
import { SponsoredAccount, AccountStatus } from '../../domain/model/account';
import pino from 'pino';

const logger = pino({
    transport: { target: 'pino-pretty' },
    name: 'Snooper'
});

export class SolanaSnooper {
    constructor(
        private connection: Connection,
        private repository: LedgerRepository,
        private koraFeePayer: string
    ) { }

    public async syncLedger() {
        const lastSig = await this.repository.getLastScannedSignature();
        const pubKey = new PublicKey(this.koraFeePayer);

        logger.info(`🔍 Snooping started. Last signature: ${lastSig || 'Genesis'}`);

        let before = undefined;

        try {
            const signatures = await this.connection.getSignaturesForAddress(pubKey, {
                limit: 50,
                until: lastSig || undefined
            });

            if (signatures.length === 0) {
                logger.info('✅ Ledger up to date.');
                return;
            }

            logger.info(`Fetched ${signatures.length} new transactions. Processing...`);

            for (const sigInfo of signatures.reverse()) {
                if (sigInfo.err) continue;

                const tx = await this.connection.getParsedTransaction(sigInfo.signature, {
                    maxSupportedTransactionVersion: 0
                });

                if (!tx) continue;
                await this.analyzeTransaction(tx, sigInfo.slot);

                await this.repository.saveLastScannedSignature(sigInfo.signature);
            }

            logger.info("Batch complete.");

        } catch (error) {
            logger.error(error, 'RPC Error');
        }
    }

    private async analyzeTransaction(tx: ParsedTransactionWithMeta, slot: number) {
        const instructions = tx.transaction.message.instructions;

        for (const ix of instructions) {
            if ('program' in ix && ix.program === 'system') {
                const parsed = (ix as any).parsed;
                if (parsed.type === 'createAccount') {
                    const info = parsed.info;

                    if (info.source === this.koraFeePayer) {
                        const account: SponsoredAccount = {
                            address: info.newAccount,
                            programOwner: info.owner,
                            rentLamports: BigInt(info.lamports),
                            creationSlot: slot,
                            closeAuthority: null,
                            status: AccountStatus.NEW,
                            updatedAt: Date.now()
                        };

                        await this.repository.upsertAccount(account);
                        logger.info(`📝 Found Sponsored Account: ${info.newAccount}`);
                    }
                }
            }
        }
    }
}