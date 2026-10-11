import { pool } from '../config/database.js';
import type { RowDataPacket, ResultSetHeader } from 'mysql2';

export interface AppControlRow extends RowDataPacket {
  id: number;
  maintenance_mode: number;
  maintenance_title: string;
  maintenance_message: string;
  maintenance_bypass_key: string;
  min_version_android: string;
  latest_version_android: string;
  store_url_android: string;
  min_version_ios: string;
  latest_version_ios: string;
  store_url_ios: string;
  min_version_web: string;
  latest_version_web: string;
  force_update_title: string;
  force_update_message: string;
  soft_update_title: string;
  soft_update_message: string;
  announcement_enabled: number;
  announcement_type: string;
  announcement_title: string;
  announcement_message: string;
  features_json: any;
  updated_at: Date;
}

export class AppControlModel {
  static async get(): Promise<AppControlRow | null> {
    const [rows] = await pool.query<AppControlRow[]>(
      'SELECT * FROM app_controls WHERE id = 1 LIMIT 1'
    );
    return rows[0] || null;
  }

  static async update(data: Partial<Omit<AppControlRow, 'id' | 'updated_at'>>): Promise<AppControlRow | null> {
    const fields = Object.keys(data);
    if (fields.length === 0) {
      return this.get();
    }

    const setClauses = fields.map((key) => `\`${key}\` = ?`).join(', ');
    const values = fields.map((key) => {
      const val = (data as any)[key];
      if (typeof val === 'object' && val !== null) {
        return JSON.stringify(val);
      }
      return val;
    });

    await pool.query<ResultSetHeader>(
      `UPDATE app_controls SET ${setClauses} WHERE id = 1`,
      values
    );

    return this.get();
  }
}
