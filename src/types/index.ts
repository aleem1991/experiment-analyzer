export type MetricType = 'continuous' | 'binary';
export type AlternativeType = 'two-sided' | 'greater' | 'less';
export type VerdictType = 'significant' | 'not_significant' | 'inconclusive' | 'invalid';
export type SourceType = 'upload' | 'paste' | 'demo';

export interface AssumptionCheck {
  name: string;
  passed: boolean;
  detail: string;
  actionTaken: string;
}

export interface GroupDescriptive {
  n: number;
  mean?: number;
  sd?: number;
  median?: number;
  iqr?: number;
  successes?: number;
  rate?: number;
  label: string;
}

export interface DescriptivesData {
  a: GroupDescriptive;
  b: GroupDescriptive;
  relativeLiftPct?: number;
  oddsRatio?: number;
  hedgesG?: number;
  cliffsDelta?: number;
}

export interface StatResult {
  test: string;
  statistic: number;
  pValue: number;
  effectName: string;
  effectValue: number;
  ciLow: number;
  ciHigh: number;
  ciLevel: number;
  mde: number;
  minEffect: number;
  verdict: VerdictType;
  assumptions: AssumptionCheck[];
  descriptives: DescriptivesData;
  caveats: string[];
  summaryText: string;
  seed: number;
  engineVersion: string;
}

export interface PreRegistrationDeclaration {
  hypothesis: string;
  metricType: MetricType;
  direction: AlternativeType;
  alpha: number;
  minEffect: number;
  expectedRatio: number;
  labelA: string;
  labelB: string;
}

export interface StoredExperiment {
  $id: string;
  $createdAt: string;
  ownerId: string;
  name: string;
  description?: string;
  metricType: MetricType;
  labelA: string;
  labelB: string;
  nA: number;
  nB: number;
  isPublic: boolean;
  source: SourceType;
}

export interface StoredAnalysis {
  $id: string;
  $createdAt: string;
  experimentId: string;
  ownerId: string;
  hypothesis: string;
  alpha: number;
  alternative: AlternativeType;
  minEffect?: number;
  test: string;
  statistic: number;
  pValue: number;
  effectName: string;
  effectValue: number;
  ciLow: number;
  ciHigh: number;
  mde: number;
  verdict: VerdictType;
  assumptionsJson: string;
  descriptivesJson?: string;
  caveats: string[];
  summaryText?: string;
  seed: number;
  engineVersion: string;
  isPublic?: boolean;
  experiment?: StoredExperiment;
}

export interface DemoItem {
  id: string;
  title: string;
  metricType: MetricType;
  expectedVerdict: VerdictType;
  description: string;
  story: string;
  csvFile: string;
  groupCol: string;
  valCol: string;
  controlVal: string;
  variantVal: string;
  declaredHypothesis: string;
  minEffect: number;
  direction: AlternativeType;
  alpha: number;
  expectedRatio: number;
}
