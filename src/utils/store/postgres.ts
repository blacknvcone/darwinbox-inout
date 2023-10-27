import pg from "pg";
import { IStore } from "./interface";
import { startJob } from "../job";
const key = "data";
const { Pool } = pg;

export const pool = process.env.POSTGRES_URL
  ? new Pool({
      connectionString: process.env.POSTGRES_URL + "?sslmode=require",
    })
  : null;

export class PGStore implements IStore {
  private data: any = {};
  constructor(defaultValue = {}) {
    this.init(defaultValue);
  }

  private async init(defaultValue: any = {}) {
    await pool?.query(`
      CREATE TABLE IF NOT EXISTS darwin_data (
        key VARCHAR(50),
        value VARCHAR(10000)
      );
    `);
    const { rows } = await pool?.query<any>(`
      SELECT * FROM darwin_data WHERE key = '${key}'
    `);

    if (!rows?.[0]) {
      this.data = defaultValue;
      await pool?.query(
        `INSERT INTO darwin_data (key, value) VALUES ('${key}', '${JSON.stringify(
          this.data
        )}')`
      );
    } else {
      this.data = JSON.parse(rows?.[0]?.value);
    }
    if (this.data?.cronIn && this.data?.cronOut) {
      startJob(this.data?.cronIn, this.data?.cronOut);
    }
  }

  public setData(data: any) {
    this.data = { ...this.data, ...data };
    pool?.query(
      `UPDATE darwin_data SET value='${JSON.stringify(
        data
      )}' WHERE key='${key}'`
    );
  }

  public getData() {
    return this.data;
  }
}