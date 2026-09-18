export type DataSource = "live" | "demo-fixture";

export interface Sourced<T> {
  data: T;
  source: DataSource;
  note?: string;
}
