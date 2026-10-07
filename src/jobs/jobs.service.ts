import { Injectable } from '@nestjs/common'
import { adminDb } from '../firebase'
import { Job } from './entities/job'

@Injectable()
export class JobsService {
  private jobs = adminDb.collection('jobs')

  async findAll(): Promise<Job[]> {
    const snapshot = await this.jobs.get()
    return snapshot.docs
      .map((doc) => {
        const data = doc.data()
        return {
          id: doc.id,
          name: data.name ?? '',
          executedAt: data.executedAt?.toDate?.().toISOString() ?? null,
        }
      })
      .sort((a, b) => a.name.localeCompare(b.name))
  }
}
