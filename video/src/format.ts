// "2012.03 ~ 2014.02"(ko) 와 "Mar 2012 – Feb 2014"(en) 모두에서 첫 연도만 뽑는다.
export function yearOf(period: string): string {
  return period.match(/\d{4}/)?.[0] ?? period;
}
