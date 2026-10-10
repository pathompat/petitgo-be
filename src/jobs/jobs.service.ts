import {
  BadGatewayException,
  Injectable,
  Logger,
  NotFoundException,
} from '@nestjs/common'
import { HttpService } from '@nestjs/axios'
import { lastValueFrom } from 'rxjs'
import { adminCredential, adminDb, projectId } from '../firebase'
import { Job } from './entities/job'

// petitgo-scheduler deploys its onSchedule functions here
const SCHEDULER_REGION = 'asia-southeast1'

/** Cloud Scheduler job that Firebase creates for an onSchedule function */
export function schedulerJobPath(name: string): string {
  return `projects/${projectId}/locations/${SCHEDULER_REGION}/jobs/firebase-schedule-${name}-${SCHEDULER_REGION}`
}

@Injectable()
export class JobsService {
  private readonly logger = new Logger(JobsService.name)
  private jobs = adminDb.collection('jobs')

  constructor(private readonly http: HttpService) {}

  async findAll(): Promise<Job[]> {
    const snapshot = await this.jobs.get()
    return snapshot.docs
      .map((doc) => {
        const data = doc.data()
        return {
          id: doc.id,
          name: data.name ?? '',
          executedAt: data.executedAt?.toDate?.().toISOString() ?? null,
          triggeredAt: data.triggeredAt?.toDate?.().toISOString() ?? null,
        }
      })
      .sort((a, b) => a.name.localeCompare(b.name))
  }

  /**
   * Fires the job's Cloud Scheduler trigger now. Sets `force` so the job
   * skips its once-per-day guard; petitgo-scheduler clears it when it runs.
   */
  async run(id: string): Promise<{ triggeredAt: string }> {
    const ref = this.jobs.doc(id)
    const doc = await ref.get()
    const name = doc.data()?.name
    if (!doc.exists || !name) {
      throw new NotFoundException(`Job ${id} not found`)
    }

    const triggeredAt = new Date()
    await ref.update({ force: true, triggeredAt })

    const { access_token } = await adminCredential.getAccessToken()
    const res = await lastValueFrom(
      this.http.post(
        `https://cloudscheduler.googleapis.com/v1/${schedulerJobPath(name)}:run`,
        {},
        {
          headers: { Authorization: `Bearer ${access_token}` },
          validateStatus: () => true,
        },
      ),
    )
    if (res.status >= 300) {
      // don't leave force set for the next scheduled run
      await ref.update({ force: false })
      const message = res.data?.error?.message ?? `HTTP ${res.status}`
      this.logger.error(`Cloud Scheduler run ${name} failed: ${message}`)
      throw new BadGatewayException(`Cloud Scheduler: ${message}`)
    }
    return { triggeredAt: triggeredAt.toISOString() }
  }
}
