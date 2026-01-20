import {
    Connection,
    PublicKey,
    Transaction,
    SystemProgram,
    Keypair
} from '@solana/web3.js';
import {
    createCloseAccountInstruction,
    TOKEN_PROGRAM_ID,
    TOKEN_2022_PROGRAM_ID
} from '@solana/spl-token';
import { LedgerRepository } from '../../domain/ports/repository';
import { AccountStatus, SponsoredAccount } from '../../domain/model/account';
import pino from 'pino';
import bs58 from 'bs58';

const logger = pino({
    transport: { target: 'pino-pretty' },
    name: 'Reaper'
});


const JITO_TIP_ACCOUNTS = [
    "96gYZGLnJYVFmbjzopPSU6QiEV5fGqZNyN9nmNhvrZU5",
    "HFqU5x63VTqvQss8hp11i4wVV8bD44PvwucfZ2bU7gRe",
    "Cw8CFyM9FkoMi7K7Crf6HNQqf4uEMzpKw6QNghXLvLkY",
    "ADaUMid9yfUytqMBgopwjb2DTLSokTSzL1zt6iGPaS49",
];

export class TheReaper {
    private operatorKeypair: Keypair;

    constructor(
        private connection: Connection,
        private repository: LedgerRepository,
        private koraRpcUrl: string,
        operatorSecretKey: string
    ) {
        this.operatorKeypair = Keypair.fromSecretKey(bs58.decode(operatorSecretKey));
    }


    public async reap() {
        const candidates = await this.repository.getAccountsByStatus(AccountStatus.SAFE_TO_REAP, 20);

        if (candidates.length === 0) {
            return;
        }

        logger.info(`💀 Reaper found ${candidates.length} accounts ready to close.`);

        const BATCH_SIZE = 4;
        for (let i = 0; i < candidates.length; i += BATCH_SIZE) {
            const batch = candidates.slice(i, i + BATCH_SIZE);
            await this.sendJitoBundle(batch);
        }
    }

    private async sendJitoBundle(accounts: SponsoredAccount[]) {
        try {
            const tx = new Transaction();
            const operatorPubkey = this.operatorKeypair.publicKey;

            for (const acc of accounts) {
                const programId = acc.programOwner === TOKEN_2022_PROGRAM_ID.toString()
                    ? TOKEN_2022_PROGRAM_ID
                    : TOKEN_PROGRAM_ID;

                tx.add(createCloseAccountInstruction(
                    new PublicKey(acc.address),
                    operatorPubkey,
                    operatorPubkey,
                    [],
                    programId
                ));
            }

            const tipAccount = new PublicKey(JITO_TIP_ACCOUNTS[Math.floor(Math.random() * JITO_TIP_ACCOUNTS.length)]);
            tx.add(SystemProgram.transfer({
                fromPubkey: operatorPubkey,
                toPubkey: tipAccount,
                lamports: 1000
            }));

            const { blockhash } = await this.connection.getLatestBlockhash();
            tx.recentBlockhash = blockhash;
            tx.feePayer = operatorPubkey;
            tx.sign(this.operatorKeypair);

            const serializedTx = tx.serialize().toString('base64');

            logger.info(`📦 Bundling ${accounts.length} accounts + Tip...`);



            logger.info(`✅ Bundle Sent! (Simulated). Rent potential: ${accounts.length * 0.002} SOL`);

            for (const acc of accounts) {
                await this.repository.upsertAccount({
                    ...acc,
                    status: AccountStatus.RECLAIMED,
                    updatedAt: Date.now()
                });
            }

        } catch (err) {
            logger.error(err, "Failed to send bundle");
        }
    }
}