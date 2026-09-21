import { Injectable } from '@nestjs/common';
import { InjectDataSource } from '@nestjs/typeorm';
import { DataSource } from 'typeorm';
import { toYuan } from '../../common/utils/money.utils';

@Injectable()
export class FinanceService {
  constructor(@InjectDataSource() private readonly dataSource: DataSource) {}

  async overview(startDate?: string, endDate?: string) {
    const df = this.dateFilter(startDate, endDate);
    const [rev, rech, refund, disc, bCnt, rCnt] = await Promise.all([
      this.q(`SELECT COALESCE(SUM(total_amount_cents-discount_cents),0) AS s FROM booking WHERE status IN ('paid','checked','completed') ${df.w}`, df.p),
      this.q(`SELECT COALESCE(SUM(amount_cents),0) AS s FROM recharge_order WHERE status='paid' ${df.w}`, df.p),
      this.q(`SELECT COALESCE(SUM(amount_cents),0) AS s FROM wallet_log WHERE type='refund' ${df.w.replace('created_at','created_at')}`, df.p),
      this.q(`SELECT COALESCE(SUM(discount_cents),0) AS s FROM booking WHERE status IN ('paid','checked','completed') ${df.w}`, df.p),
      this.q(`SELECT COUNT(*) AS c FROM booking WHERE status IN ('paid','checked','completed') ${df.w}`, df.p),
      this.q(`SELECT COUNT(*) AS c FROM recharge_order WHERE status='paid' ${df.w}`, df.p),
    ]);
    const r=Number(rev[0]?.s??0), c=Number(rech[0]?.s??0), rf=Number(refund[0]?.s??0);
    return {
      totalRevenue: toYuan(r), totalRecharge: toYuan(c), totalRefund: toYuan(rf),
      totalDiscount: toYuan(Number(disc[0]?.s??0)), netIncome: toYuan(c-rf),
      bookingCount: Number(bCnt[0]?.c??0), rechargeCount: Number(rCnt[0]?.c??0),
      avgBookingAmount: Number(bCnt[0]?.c??0)>0 ? toYuan(Math.round(r/Number(bCnt[0]?.c??0))) : 0,
    };
  }

  async revenueTrend(days: number) {
    const dates = this.lastN(days);
    const [br,ra,rf] = await Promise.all([
      this.dailySum('booking','total_amount_cents-discount_cents','created_at',dates,"AND status IN ('paid','checked','completed')"),
      this.dailySum('recharge_order','amount_cents','created_at',dates,"AND status='paid'"),
      this.dailySum('wallet_log','amount_cents','created_at',dates,"AND type='refund'"),
    ]);
    return { dates: dates.map(d=>d.slice(5).replace('-','/')), bookingRevenue: br.map(v=>toYuan(v)), rechargeAmount: ra.map(v=>toYuan(v)), refundAmount: rf.map(v=>toYuan(v)) };
  }

  async revenueBySource(startDate?: string, endDate?: string) {
    const df = this.dateFilter(startDate, endDate);
    const [b,i,r] = await Promise.all([
      this.q(`SELECT COALESCE(SUM(total_amount_cents-discount_cents),0) AS s FROM booking WHERE status IN ('paid','checked','completed') ${df.w}`, df.p),
      this.q(`SELECT COALESCE(SUM(total_amount_cents),0) AS s FROM item_rental WHERE status IN ('paid','checked','completed') ${df.w}`, df.p),
      this.q(`SELECT COALESCE(SUM(amount_cents),0) AS s FROM recharge_order WHERE status='paid' ${df.w}`, df.p),
    ]);
    return [
      {name:'场地预订',value:toYuan(Number(b[0]?.s??0))},
      {name:'器材租赁',value:toYuan(Number(i[0]?.s??0))},
      {name:'会员充值',value:toYuan(Number(r[0]?.s??0))},
    ];
  }

  async transactions(page: number, pageSize: number, type?: string) {
    const skip=(page-1)*pageSize;
    let where="WHERE t.type!='signin'";
    if(type==='income') where+=" AND t.type IN ('recharge','booking')";
    if(type==='expense') where+=" AND t.type IN ('deduct','refund')";
    const rows = await this.dataSource.query(`
      SELECT t.*,m.phone,m.nickname FROM (
        SELECT 'recharge' AS type,order_no AS no,amount_cents AS amount,created_at,member_id,'充值' AS description FROM recharge_order WHERE status='paid'
        UNION ALL SELECT 'booking' AS type,booking_no AS no,total_amount_cents AS amount,created_at,member_id,'场地预订' AS description FROM booking WHERE status IN ('paid','checked','completed')
        UNION ALL SELECT 'refund' AS type,CONCAT('WL-',w.id) AS no,-amount_cents AS amount,w.created_at,w.member_id,'退款' AS description FROM wallet_log w WHERE w.type='refund'
        UNION ALL SELECT 'deduct' AS type,CONCAT('WL-',w.id) AS no,-amount_cents AS amount,w.created_at,w.member_id,remark AS description FROM wallet_log w WHERE w.type='deduct'
      ) t LEFT JOIN member m ON m.id=t.member_id ${where} ORDER BY t.created_at DESC LIMIT ? OFFSET ?
    `, [pageSize, skip]);
    const cnt = await this.dataSource.query(`SELECT COUNT(*) AS c FROM (SELECT 'recharge' AS type FROM recharge_order WHERE status='paid' UNION ALL SELECT 'booking' AS type FROM booking WHERE status IN ('paid','checked','completed') UNION ALL SELECT 'refund' AS type FROM wallet_log WHERE type='refund' UNION ALL SELECT 'deduct' AS type FROM wallet_log WHERE type='deduct') t ${where}`);
    return { list: rows.map((r:any)=>({ type:r.type, typeText:r.description, orderNo:r.no, amount:toYuan(Math.abs(Number(r.amount))), isIncome:Number(r.amount)>0, phone:r.phone, nickname:r.nickname, createdAt:r.created_at })), total:Number(cnt[0]?.c??0), page, pageSize };
  }

  private async q(sql: string, params: any[]): Promise<any[]> { return this.dataSource.query(sql, params); }
  private lastN(n:number):string[]{const d=[];const now=new Date();for(let i=n-1;i>=0;i--){const dt=new Date(now);dt.setDate(now.getDate()-i);d.push(`${dt.getFullYear()}-${String(dt.getMonth()+1).padStart(2,'0')}-${String(dt.getDate()).padStart(2,'0')}`);}return d;}
  private dateFilter(s?:string,e?:string){const w=[];const p:any[]=[];if(s){w.push('created_at>=?');p.push(s+' 00:00:00');}if(e){w.push('created_at<=?');p.push(e+' 23:59:59');}return{w:w.length?'AND '+w.join(' AND '):'',p};}
  private async dailySum(t: string, s: string, d: string, dates: string[], extra = ''): Promise<number[]> {
    const start = dates[0] + ' 00:00:00';
    const rows: any[] = await this.dataSource.query(`SELECT DATE(${d}) AS d, SUM(${s}) AS s FROM ${t} WHERE ${d} >= ? ${extra} GROUP BY DATE(${d})`, [start]);
    const map = new Map(rows.map((r) => [String(r.d).slice(0, 10), Number(r.s)]));
    return dates.map((date) => map.get(date) ?? 0);
  }
}
