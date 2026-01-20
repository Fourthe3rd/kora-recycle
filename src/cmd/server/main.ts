import { Connection } from '@solana/web3.js';
import { SqliteRepository } from '../../internal/infrastructure/persistence/sqlite-repository';
import { SolanaSnooper } from '../../internal/infrastructure/solana/snooper';
import { TheJudge } from '../../internal/domain/services/judge';
import { TheReaper } from '../../internal/infrastructure/jito/reaper';
import { TrashService } from '../../internal/simulation/trash_service';
import * as dotenv from 'dotenv';
import path from 'path';
import express from 'express';
import cors from 'cors';

dotenv.config();

function startServer(repo: SqliteRepository) {
    const app = express();
    app.use(cors());
    app.use(express.json());

    const trashService = new TrashService();

    app.get('/metrics', async (req, res) => {
        try {
            const db = (repo as any).db;

            const totalReclaimed = db.prepare("SELECT COUNT(*) as count FROM accounts WHERE status = 'RECLAIMED'").get().count;
            const pending = db.prepare("SELECT COUNT(*) as count FROM accounts WHERE status = 'SAFE_TO_REAP'").get().count;


            const recentLogs = db.prepare("SELECT * FROM accounts ORDER BY updated_at DESC LIMIT 5").all();

            res.json({
                system_status: 'ONLINE',
                network: 'DEVNET',
                stats: {
                    accounts_reclaimed: totalReclaimed,
                    sol_recovered: totalReclaimed * 0.002039,
                    usd_saved: (totalReclaimed * 0.002039 * 145.50).toFixed(2),
                    pending_reap: pending
                },
                logs: recentLogs
            });
        } catch (e) {
            res.status(500).json({ error: 'Telemetry Error' });
        }
    });

    app.post('/command', async (req, res) => {
        const { cmd } = req.body;

        if (cmd.startsWith('/seed')) {
            const parts = cmd.split(' ');
            const count = parseInt(parts[1]) || 1;
            const safeCount = Math.min(count, 5);

            res.json({
                type: 'system',
                message: `Executing simulation protocol... Generating ${safeCount} dormant accounts.`
            });

            trashService.createTrash(safeCount).then(sigs => {
                console.log(`✅ Simulation complete. ${sigs.length} accounts created.`);
            });

        } else if (cmd === '/status') {
            res.json({ type: 'system', message: 'System Operational. Jito Bundle Engine: ACTIVE.' });
        } else {
            res.json({ type: 'error', message: 'Unknown command. Try: /seed 4' });
        }
    });

    app.listen(3001, () => {
        console.log('📡 Kora Command Uplink: http://localhost:3001');
    });
}

async function main() {
    const RPC_URL = 'https://api.devnet.solana.com';
    const KORA_FEE_PAYER = process.env.KORA_FEE_PAYER;
    const KORA_SECRET = process.env.KORA_OPERATOR_KEY;
    const DB_PATH = path.join(process.cwd(), 'kora_recycle.db');

    if (!KORA_FEE_PAYER || !KORA_SECRET) process.exit(1);

    console.log('🚀 KORA RECYCLE INFRASTRUCTURE STARTING');

    const connection = new Connection(RPC_URL);
    const repo = new SqliteRepository(DB_PATH);

    startServer(repo);

    const snooper = new SolanaSnooper(connection, repo, KORA_FEE_PAYER);
    const judge = new TheJudge(connection, repo, KORA_FEE_PAYER);
    const reaper = new TheReaper(connection, repo, 'http://localhost:8080', KORA_SECRET);

    console.log('⏱️  Cycle Started: Snoop -> Judge -> Reap');

    setInterval(async () => {
        await snooper.syncLedger();
        await judge.evaluateCandidates();
        await reaper.reap();
    }, 10000);

    await snooper.syncLedger();
    await judge.evaluateCandidates();
    await reaper.reap();
}

main().catch(console.error);