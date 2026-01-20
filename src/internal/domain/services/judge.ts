import { Connection, PublicKey } from '@solana/web3.js';
import { LedgerRepository } from '../ports/repository';
import { AccountStatus, SponsoredAccount } from '../model/account';
import pino from 'pino';

const logger = pino({
    transport: { target: 'pino-pretty' },
    name: 'Judge'
});

const TOKEN_PROGRAM_ID = 'TokenkegQfeZyiNwAJbNbGKPFXCWuBvf9Ss623VQ5DA';
const TOKEN_2022_ID = 'TokenzQdBNbLqP5VEhdkAS6EPFLC1PHnBqCXEpPxuEb';

export class TheJudge {
    constructor(
        private connection: Connection,
        private repository: LedgerRepository,
        private operatorAddress: string
    ) { }

    public async evaluateCandidates() {
        const candidates = await this.repository.getAccountsByStatus(AccountStatus.NEW, 50);

        if (candidates.length === 0) return;

        logger.info(`⚖️  Judge analyzing ${candidates.length} new candidates...`);

        for (const account of candidates) {
            await this.verdict(account);
        }
    }

    public async verdict(account: SponsoredAccount): Promise<boolean> {
        try {
            const info = await this.connection.getParsedAccountInfo(new PublicKey(account.address));

            if (!info.value) {
                logger.info(`⚰️  ${account.address} is already closed.`);
                await this.repository.updateStatus(account.address, AccountStatus.RECLAIMED);
                return false;
            }

            const data = info.value.data;
            const owner = info.value.owner.toString();

            if (owner !== TOKEN_PROGRAM_ID && owner !== TOKEN_2022_ID) {
                await this.repository.updateStatus(account.address, AccountStatus.UNSAFE);
                return false;
            }

            if ('parsed' in data) {
                const parsedInfo = data.parsed.info;

                const amount = Number(parsedInfo.tokenAmount.amount);
                if (amount > 0) {
                    return false;
                }

                const authority = parsedInfo.closeAuthority || parsedInfo.owner;

                if (authority === this.operatorAddress) {
                    logger.info(`✅ SENTENCE: RECLAIM. ${account.address} is empty and ours.`);
                    await this.repository.updateStatus(account.address, AccountStatus.SAFE_TO_REAP);
                    return true;
                } else {
                    logger.warn(`🛑 UNSAFE: Authority mismatch on ${account.address}`);
                    await this.repository.updateStatus(account.address, AccountStatus.UNSAFE);
                    return false;
                }
            }

            return false;
        } catch (e) {
            logger.error(`Error judging ${account.address}`);
            return false;
        }
    }
}