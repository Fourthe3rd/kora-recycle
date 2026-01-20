import { Connection, Keypair, SystemProgram, Transaction } from '@solana/web3.js';
import { createInitializeAccountInstruction, TOKEN_PROGRAM_ID, NATIVE_MINT } from '@solana/spl-token';
import * as dotenv from 'dotenv';
import bs58 from 'bs58';

dotenv.config();

async function litter() {
  const connection = new Connection(process.env.SOLANA_RPC_URL || 'https://api.devnet.solana.com');
  const decode = bs58.decode || (bs58 as any).default?.decode;
  const secret = process.env.KORA_OPERATOR_KEY!;
  const payer = Keypair.fromSecretKey(decode(secret));

  console.log(`🗑️  BULK LITTERING initiated by: ${payer.publicKey.toBase58()}`);

  const TRASH_COUNT = 4;

  for (let i = 0; i < TRASH_COUNT; i++) {
    try {
      const newAccount = Keypair.generate();
      const rent = await connection.getMinimumBalanceForRentExemption(165);

      const tx = new Transaction().add(
        SystemProgram.createAccount({
          fromPubkey: payer.publicKey,
          newAccountPubkey: newAccount.publicKey,
          space: 165,
          lamports: rent,
          programId: TOKEN_PROGRAM_ID,
        }),
        createInitializeAccountInstruction(
          newAccount.publicKey,
          NATIVE_MINT,
          payer.publicKey
        )
      );

      const sig = await connection.sendTransaction(tx, [payer, newAccount]);
      console.log(`[${i + 1}/${TRASH_COUNT}] 🚮 Trash Dropped: ${newAccount.publicKey.toBase58().slice(0, 8)}...`);
      await new Promise(r => setTimeout(r, 1000));
    } catch (e) {
      console.error(`❌ Trash Error:`, e);
    }
  }
}

litter().catch(console.error);