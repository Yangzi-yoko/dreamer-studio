import { Injectable } from '@nestjs/common';
import { InjectDataSource } from '@nestjs/typeorm';
import { DataSource } from 'typeorm';
import { toYuan } from '../../common/utils/money.utils';

export interface TrendPoint {
  date: string;
  count: number;
}

@Injectable()
export class DashboardService {
  constructor(@InjectDataSource() private readonly dataSource: DataSource) {}

  private lastNDays(n: number): string[] {
    const days: string[] = [];
    const now = new Date();
    for (let i = n - 1; i >= 0; i--) {
      const d = new Date(now);
      d.setDate(now.getDate() - i);
      const y = d.getFullYear();
      const m = String(d.getMonth() + 1).padStart(2, '0');
      const day = String(d.getDate()).padStart(2, '0');
      days.push(`${y}-${m}-${day}`);
    }
    return days;
  }

  private async dailyCount(table: string, dateColumn: string, days: string[], extraWhere = ''): Promise<TrendPoint[]> {
    const start = days[0] + ' 00:00:00';
    const rows: { d: string; c: string }[] = await this.dataSource.query(
      `SELECT DATE(${dateColumn}) AS d, COUNT(*) AS c FROM ${table} WHERE ${dateColumn} >= ? ${extraWhere} GROUP BY DATE(${dateColumn})`,
      [start],
    );
    const map = new Map(rows.map((r) => [String(r.d).slice(0, 10), Number(r.c)]));
    return days.map((date) => ({ date, count: map.get(date) ?? 0 }));
  }

  async stats() {
    const days = this.lastNDays(14);

    const [memberTotalC, memberTodayC, bookingTotalC] = await Promise.all([
      this.dataSource.query('SELECT COUNT(*) AS c FROM member'),
      this.dataSource.query('SELECT COUNT(*) AS c FROM member WHERE created_at >= CURDATE()'),
      this.dataSource.query('SELECT COUNT(*) AS c FROM booking'),
    ]);

    const revenueRows: { total: string }[] = await this.dataSource.query(
      `SELECT COALESCE(SUM(total_amount_cents), 0) AS total FROM booking WHERE status IN ('paid','checked','completed')`,
    );
    const itemRevenueRows: { total: string }[] = await this.dataSource.query(
      `SELECT COALESCE(SUM(total_amount_cents), 0) AS total FROM item_rental WHERE status IN ('paid','checked','completed')`,
    );
    const rechargeRows: { total: string }[] = await this.dataSource.query(
      `SELECT COALESCE(SUM(amount_cents), 0) AS total FROM recharge_order WHERE status = 'paid'`,
    );
    const walletRows: { total: string }[] = await this.dataSource.query(
      `SELECT COALESCE(SUM(balance_cents), 0) AS total FROM member_wallet`,
    );
    const studioRows: { c: string }[] = await this.dataSource.query(
      `SELECT COUNT(*) AS c FROM studio WHERE enabled = 1`,
    );
    const bookingStatusRows: { status: string; c: string }[] = await this.dataSource.query(
      `SELECT status, COUNT(*) AS c FROM booking GROUP BY status`,
    );
    const memberTrend = await this.dailyCount('member', 'created_at', days);
    const bookingTrend = await this.dailyCount('booking', 'created_at', days);
    const todayBookingRows: { c: string }[] = await this.dataSource.query(
      `SELECT COUNT(*) AS c FROM booking WHERE booking_date = CURDATE()`,
    );

    const statusCounts: Record<string, number> = {};
    bookingStatusRows.forEach((r) => {
      statusCounts[r.status] = Number(r.c);
    });

    return {
      overview: {
        memberTotal: Number(memberTotalC[0]?.c ?? 0),
        memberToday: Number(memberTodayC[0]?.c ?? 0),
        bookingTotal: Number(bookingTotalC[0]?.c ?? 0),
        bookingToday: Number(todayBookingRows[0]?.c ?? 0),
        revenueYuan: toYuan(Number(revenueRows[0]?.total ?? 0) + Number(itemRevenueRows[0]?.total ?? 0)),
        rechargeYuan: toYuan(Number(rechargeRows[0]?.total ?? 0)),
        walletBalanceYuan: toYuan(Number(walletRows[0]?.total ?? 0)),
        studioCount: Number(studioRows[0]?.c ?? 0),
      },
      statusCounts,
      memberTrend,
      bookingTrend,
    };
  }
}