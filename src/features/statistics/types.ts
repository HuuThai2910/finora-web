/**
 * Kiểu dữ liệu của API thống kê quản trị, khớp hợp đồng STATS-001
 * (`finora-platform/.agents/plans/STATS-001-admin-statistics-api.md`).
 *
 * Tiền là `BigDecimal` scale 2, đến web dưới dạng JSON number; chỉ format ở lớp hiển thị.
 * Bản đồ đếm theo trạng thái để `Partial<Record<string, number>>`: backend có thể chỉ trả khóa khác 0
 * và có thể thêm trạng thái mới, nơi đọc phải coi khóa thiếu là 0.
 */

export type StatisticsBucket = 'DAY' | 'WEEK' | 'MONTH';

/** Tham số chung của mọi API series: `from`, `to` dạng YYYY-MM-DD theo giờ Việt Nam. */
export interface StatisticsRange {
  from: string;
  to: string;
  bucket: StatisticsBucket;
}

export type CountMap = Partial<Record<string, number>>;

/** Khung chung của response series: `from`/`to` đã được backend nới về đầu và cuối cột. */
export interface StatisticsSeries<TPoint> {
  from: string;
  to: string;
  bucket: StatisticsBucket;
  timezone: string;
  /** Đủ mọi cột trong khoảng, kể cả cột bằng 0. */
  points: TPoint[];
}

/* ---------------- Loan ---------------- */

export interface DebtGroupStat {
  /** Nhóm nợ 1 đến 5; backend luôn trả đủ năm nhóm. */
  debtGroup: number;
  loans: number;
  principalOutstanding: number;
  overdueAmount: number;
}

export interface CreditGradeStat {
  /** Hạng định giá của hồ sơ; thiếu thì backend trả `"UNGRADED"`. */
  grade: string;
  loans: number;
  principalOutstanding: number;
}

export interface ProductStat {
  productId: number;
  productCode: string;
  productName: string;
  applications: number;
  outstandingLoans: number;
  principalOutstanding: number;
  nplPrincipalOutstanding: number;
  /** `null` khi sản phẩm không còn dư nợ gốc. */
  nplRatioPercent: number | null;
}

export interface ScoreHistogramBin {
  from: number;
  to: number;
  count: number;
}

export interface LoanStatisticsSummary {
  asOf: string;
  applications: {
    total: number;
    byStatus: CountMap;
    byFundingStatus: CountMap;
  };
  portfolio: {
    loansByStatus: CountMap;
    outstandingLoans: number;
    principalOutstanding: number;
    totalOutstanding: number;
    overdueAmount: number;
    nplPrincipalOutstanding: number;
    /** NPL / dư nợ gốc × 100, 2 chữ số; `null` khi dư nợ gốc bằng 0. */
    nplRatioPercent: number | null;
    /** Số projection Fineract bị đánh dấu cũ: lớn hơn 0 thì dư nợ có thể chưa cập nhật. */
    staleProjections: number;
    byDebtGroup: DebtGroupStat[];
    byCreditGrade: CreditGradeStat[];
    byProduct: ProductStat[];
  };
  collections: {
    openCases: number;
    /** Khóa là `CollectionStage` (EARLY_REMINDER, ATTENTION, NPL, INTENSIVE, LOSS). */
    openByStage: CountMap;
    byStatus: CountMap;
  };
  reschedules: { byStatus: CountMap };
  reconciliationIncidents: { byStatus: CountMap };
  creditScores: {
    assessed: number;
    byGrade: CountMap;
    /** 10 cột rộng 10 điểm trên thang 0 đến 100, cột cuối gồm cả 100; luôn đủ 10 cột. */
    histogram: ScoreHistogramBin[];
  };
}

export interface LoanSeriesPoint {
  bucketStart: string;
  applicationsSubmitted: number;
  applicationsApproved: number;
  applicationsRejected: number;
  loansDisbursed: number;
  disbursedAmount: number;
  /**
   * Tổng số tiền đề nghị của hồ sơ nộp trong cột. Trường mới (2026-10-08): gateway chưa cập nhật thì
   * thiếu, nơi đọc phải coi `undefined` là "chưa có số liệu", không phải 0.
   */
  applicationsSubmittedAmount?: number;
}

/** Dòng thưa: chỉ có cặp (cột, sản phẩm) khác 0. */
export interface LoanProductPoint {
  bucketStart: string;
  productId: number;
  applicationsSubmitted: number;
  disbursedAmount: number;
  /** Tổng số tiền đề nghị của hồ sơ nộp trong cột cho sản phẩm này; thiếu khi backend chưa cập nhật. */
  applicationsSubmittedAmount?: number;
}

/** Cohort hồ sơ nộp trong khoảng, đếm số đã tới từng bước. */
export interface LoanFunnel {
  submitted: number;
  scored: number;
  approved: number;
  termsAccepted: number;
  fundingRequested: number;
  fullyFunded: number;
  disbursed: number;
}

export interface LoanStatisticsSeries extends StatisticsSeries<LoanSeriesPoint> {
  productPoints: LoanProductPoint[];
  funnel: LoanFunnel;
}

/* ---------------- User ---------------- */

export interface UserSeriesPoint {
  bucketStart: string;
  registered: number;
  registeredBorrowers: number;
  registeredInvestors: number;
  ekycVerified: number;
  ekycFailed: number;
}

export type UserStatisticsSeries = StatisticsSeries<UserSeriesPoint>;

/* ---------------- Investment ---------------- */

export interface InvestmentStatisticsSummary {
  asOf: string;
  listings: { byStatus: CountMap };
  openFunding: {
    listings: number;
    targetAmount: number;
    committedAmount: number;
    fillRatePercent: number | null;
  };
  notes: { byStatus: CountMap; activeOutstandingPrincipal: number };
  autoInvest: { activeConfigs: number };
}

export interface InvestmentSeriesPoint {
  bucketStart: string;
  committedAmount: number;
  commitments: number;
  listingsFullyFunded: number;
  trades: number;
  tradedAmount: number;
  platformFee: number;
  /** Giá khớp bình quân theo khối lượng, phần nghìn (985 = 98,5%); `null` khi cột không có lần khớp. */
  averagePricePermille: number | null;
  autoInvestPlaced: number;
  autoInvestSkipped: number;
  /*
   * Các trường mới (2026-10-08), thiếu khi backend chưa cập nhật. "performing" chỉ tính lần khớp của Note
   * thuộc khoản vay chưa vỡ nợ, để giá bình quân không bị khoản nợ xấu (giá rất thấp) kéo xuống.
   */
  /** Tổng số Note đã khớp trong cột. */
  tradedQuantity?: number;
  performingTrades?: number;
  performingQuantity?: number;
  /** Giá bình quân theo số Note của lần khớp không thuộc khoản nợ xấu, phần nghìn; `null` khi không có. */
  performingAveragePricePermille?: number | null;
}

export type InvestmentStatisticsSeries = StatisticsSeries<InvestmentSeriesPoint>;
