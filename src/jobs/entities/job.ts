/** A `jobs` document: last successful run of a petitgo-scheduler job */
export class Job {
  id: string
  name: string
  executedAt: string | null
  /** When Run Now was last requested from the admin page */
  triggeredAt: string | null
}
