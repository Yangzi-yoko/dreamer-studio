import { Injectable } from '@nestjs/common';
import { InjectDataSource } from '@nestjs/typeorm';
import { DataSource } from 'typeorm';
import { toYuan } from '../../common/utils/money.utils';

type LineType = 'newVisits' | 'messages' | 'purchases' | 'shoppings';

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

  private async dailyCount(table: string, dateColumn: string, days: string[], extraWhere = ''): Promise<number[]> {
    const start = days[0] + ' 00:00:00';
    const rows: { d: string; c: string }[] = await this.dataSource.query(
      `SELECT DATE(${dateColumn}) AS d, COUNT(*) AS c FROM ${table} WHERE ${dateColumn} >= ? ${extraWhere} GROUP BY DATE(${dateColumn})`,
      [start],
    );
    const map = new Map(rows.map((r) => [String(r.d).slice(0, 10), Number(r.c)]));
    return days.map((date) => map.get(date) ?? 0);
  }

  private async dailySum(table: string, sumColumn: string, dateColumn: string, days: string[], extraWhere = ''): Promise<number[]> {
    const start = days[0] + ' 00:00:00';
    const rows: { d: string; s: string }[] = await this.dataSource.query(
      `SELECT DATE(${dateColumn}) AS d, SUM(${sumColumn}) AS s FROM ${table} WHERE ${dateColumn} >= ? ${extraWhere} GROUP BY DATE(${dateColumn})`,
      [start],
    );
    const map = new Map(rows.map((r) => [String(r.d).slice(0, 10), Number(r.s)]));
    return days.map((date) => map.get(date) ?? 0);
  }

  async panel() {
    const [memberTotal, memberToday, bookingTotal, revenue, itemRevenue, recharge, wallet, studio] = await Promise.all([
      this.dataSource.query('SELECT COUNT(*) AS c FROM member'),
      this.dataSource.query('SELECT COUNT(*) AS c FROM member WHERE created_at >= CURDATE()'),
      this.dataSource.query('SELECT COUNT(*) AS c FROM booking'),
      this.dataSource.query(`SELECT COALESCE(SUM(total_amount_cents),0) AS s FROM booking WHERE status IN ('paid','checked','completed')`),
      this.dataSource.query(`SELECT COALESCE(SUM(total_amount_cents),0) AS s FROM item_rental WHERE status IN ('paid','checked','completed')`),
      this.dataSource.query(`SELECT COALESCE(SUM(amount_cents),0) AS s FROM recharge_order WHERE status = 'paid'`),
      this.dataSource.query(`SELECT COALESCE(SUM(balance_cents),0) AS s FROM member_wallet`),
      this.dataSource.query(`SELECT COUNT(*) AS c FROM studio WHERE enabled = 1`),
    ]);
    return {
      newVisits: Number(memberTotal[0]?.c ?? 0),
      messages: Number(memberToday[0]?.c ?? 0),
      purchases: Number(bookingTotal[0]?.c ?? 0),
      shoppings: toYuan(Number(revenue[0]?.s ?? 0) + Number(itemRevenue[0]?.s ?? 0)),
      statusCounts: { rechargeYuan: toYuan(Number(recharge[0]?.s ?? 0)), walletBalanceYuan: toYuan(Number(wallet[0]?.s ?? 0)), studioCount: Number(studio[0]?.c ?? 0) },
    };
  }

  async line(type: LineType) {
    const days = this.lastNDays(7);
    const short = days.map((d) => d.slice(5).replace('-', '/'));
    const memberDaily = await this.dailyCount('member', 'created_at', days);
    const bookingDaily = await this.dailyCount('booking', 'created_at', days);
    const signinDaily = await this.dailyCount('member_signin_log', 'created_at', days);
    const rechargeDaily = await this.dailyCount('recharge_order', 'created_at', days, `AND status = 'paid'`);
    const revenueDaily = await this.dailySum('booking', 'total_amount_cents', 'created_at', days, `AND status IN ('paid','checked','completed')`);
    const completeDaily = await this.dailyCount('booking', 'created_at', days, `AND status = 'completed'`);
    const pendingDaily = await this.dailyCount('booking', 'created_at', days, `AND status = 'pending'`);
    const rechargeAmountDaily = await this.dailySum('recharge_order', 'amount_cents', 'created_at', days, `AND status = 'paid'`);

    const series: Record<LineType, { expectedData: number[]; actualData: number[] }> = {
      newVisits: { expectedData: memberDaily, actualData: bookingDaily },
      messages: { expectedData: signinDaily, actualData: rechargeDaily },
      purchases: { expectedData: pendingDaily, actualData: completeDaily },
      shoppings: { expectedData: revenueDaily.map((c) => toYuan(c)), actualData: rechargeAmountDaily.map((c) => toYuan(c)) },
    };

    return { dates: short, series };
  }

  async radar() {
    const [member, booking, revenue, recharge, signin, studio] = await Promise.all([
      this.dataSource.query(`SELECT COUNT(*) AS c FROM member`),
      this.dataSource.query(`SELECT COUNT(*) AS c FROM booking`),
      this.dataSource.query(`SELECT COALESCE(SUM(total_amount_cents),0) AS s FROM booking WHERE status IN ('paid','checked','completed')`),
      this.dataSource.query(`SELECT COALESCE(SUM(amount_cents),0) AS s FROM recharge_order WHERE status = 'paid'`),
      this.dataSource.query(`SELECT COUNT(*) AS c FROM member_signin_log`),
      this.dataSource.query(`SELECT COUNT(*) AS c FROM studio WHERE enabled = 1`),
    ]);
    const max: Record<string, number> = {
      member: 10000,
      booking: 10000,
      revenue: 100000,
      recharge: 100000,
      signin: 100000,
      studio: 50,
    };
    const indicatorNames: Record<string, string> = {
      member: '会员总数',
      booking: '订单总数',
      revenue: '营业额',
      recharge: '充值总额',
      signin: '签到次数',
      studio: '场地数',
    };
    const indicators = Object.keys(max).map((key) => ({ name: indicatorNames[key], max: max[key] }));
    const value = [
      Number(member[0]?.c ?? 0),
      Number(booking[0]?.c ?? 0),
      toYuan(Number(revenue[0]?.s ?? 0)),
      toYuan(Number(recharge[0]?.s ?? 0)),
      Number(signin[0]?.c ?? 0),
      Number(studio[0]?.c ?? 0),
    ];
    return { indicators, series: [{ name: '当前存量', value }] };
  }

  async pie() {
    const rows: { status: string; c: string }[] = await this.dataSource.query(`SELECT status, COUNT(*) AS c FROM booking GROUP BY status`);
    return rows.map((r) => ({ name: r.status, value: Number(r.c) }));
  }

  async bar() {
    const days = this.lastNDays(7);
    const short = days.map((d) => d.slice(5).replace('-', '/'));
    const [bookingDaily, itemDaily, rechargeDaily] = await Promise.all([
      this.dailyCount('booking', 'created_at', days),
      this.dailyCount('item_rental', 'created_at', days),
      this.dailyCount('recharge_order', 'created_at', days),
    ]);
    return {
      dates: short,
      series: [
        { name: 'studio', data: bookingDaily },
        { name: 'item', data: itemDaily },
        { name: 'recharge', data: rechargeDaily },
      ],
    };
  }

  async transactions() {
    const rows: { booking_no: string; customer_name: string; total_amount_cents: string; status: string; booking_date: string }[] =
      await this.dataSource.query(
        `SELECT booking_no, customer_name, total_amount_cents, status, booking_date FROM booking ORDER BY created_at DESC LIMIT 8`,
      );
    return rows.map((r) => ({
      order_no: r.booking_no,
      customer: r.customer_name,
      price: toYuan(Number(r.total_amount_cents)),
      status: r.status,
      date: r.booking_date,
    }));
  }
}