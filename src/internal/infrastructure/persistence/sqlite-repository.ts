import Database from 'better-sqlite3';
import { LedgerRepository } from '../../domain/ports/repository';
import { SponsoredAccount, AccountStatus } from '../../domain/model/account';

export class SqliteRepository implements LedgerRepository {
    private db: Database.Database;

    constructor(dbPath: string) {
        this.db = new Database(dbPath);
        this.initialize();
    }

    private initialize() {
        this.db.exec(`
      CREATE TABLE IF NOT EXISTS accounts (
        address TEXT PRIMARY KEY,
        program_owner TEXT,
        rent_lamports TEXT,
        creation_slot INTEGER,
        status TEXT,
        updated_at INTEGER
      );
      CREATE TABLE IF NOT EXISTS cursor (
        id TEXT PRIMARY KEY CHECK (id = 'main'),
        last_signature TEXT
      );
    `);
    }

    async upsertAccount(account: SponsoredAccount): Promise<void> {
        const stmt = this.db.prepare(`
            INSERT INTO accounts (address, program_owner, rent_lamports, creation_slot, status, updated_at)
            VALUES (?, ?, ?, ?, ?, ?)
            ON CONFLICT(address) DO UPDATE SET 
                status = excluded.status,
                updated_at = excluded.updated_at
        `);
        stmt.run(
            account.address,
            account.programOwner,
            account.rentLamports.toString(),
            account.creationSlot,
            account.status,
            account.updatedAt
        );
    }

    async getLastScannedSignature(): Promise<string | null> {
        const row = this.db.prepare("SELECT last_signature FROM cursor WHERE id = 'main'").get() as any;
        return row ? row.last_signature : null;
    }

    async saveLastScannedSignature(signature: string): Promise<void> {
        this.db.prepare(`
            INSERT INTO cursor (id, last_signature) VALUES ('main', ?)
            ON CONFLICT(id) DO UPDATE SET last_signature = ?
        `).run(signature, signature);
    }

    async getAccountsByStatus(status: AccountStatus, limit: number): Promise<SponsoredAccount[]> {
        const rows = this.db.prepare(`
            SELECT * FROM accounts WHERE status = ? LIMIT ?
        `).all(status, limit) as any[];

        return rows.map(row => ({
            address: row.address,
            programOwner: row.program_owner,
            rentLamports: BigInt(row.rent_lamports),
            creationSlot: row.creation_slot,
            status: row.status as AccountStatus,
            closeAuthority: null,
            updatedAt: row.updated_at
        }));
    }


    async updateStatus(address: string, status: AccountStatus): Promise<void> {
        this.db.prepare(`
            UPDATE accounts 
            SET status = ?, updated_at = ? 
            WHERE address = ?
        `).run(status, Date.now(), address);
    }
}