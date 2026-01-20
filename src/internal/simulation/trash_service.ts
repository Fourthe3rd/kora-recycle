import { Connection, Keypair, SystemProgram, Transaction } from '@solana/web3.js';
import { createInitializeAccountInstruction, TOKEN_PROGRAM_ID, NATIVE_MINT } from '@solana/spl-token';
import bs58 from 'bs58';
import * as dotenv from 'dotenv';

dotenv.config();

export class TrashService {
    private connection: Connection;
    private payer: Keypair;

    constructor() {
        this.connection = new Connection(process.env.SOLANA_RPC_URL || 'https://api.devnet.solana.com');
        const decode = bs58.decode || (bs58 as any).default?.decode;
        this.payer = Keypair.fromSecretKey(decode(process.env.KORA_OPERATOR_KEY!));
    }

    async createTrash(count: number): Promise<string[]> {
        const signatures: string[] = [];
        console.log(`🗑️  API REQUEST: Creating ${count} trash accounts...`);

        for (let i = 0; i < count; i++) {
            try {
                const newAccount = Keypair.generate();
                const rent = await this.connection.getMinimumBalanceForRentExemption(165);

                const tx = new Transaction().add(
                    SystemProgram.createAccount({
                        fromPubkey: this.payer.publicKey,
                        newAccountPubkey: newAccount.publicKey,
                        space: 165,
                        lamports: rent,
                        programId: TOKEN_PROGRAM_ID,
                    }),
                    createInitializeAccountInstruction(
                        newAccount.publicKey,
                        NATIVE_MINT,
                        this.payer.publicKey
                    )
                );

                const sig = await this.connection.sendTransaction(tx, [this.payer, newAccount]);
                signatures.push(sig);

                await new Promise(r => setTimeout(r, 500));
            } catch (e) {
                console.error(`❌ Trash Error:`, e);
            }
        }
        return signatures;
    }
}