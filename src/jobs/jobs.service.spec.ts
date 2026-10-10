jest.mock('../firebase')

import { Test, TestingModule } from '@nestjs/testing'
import { BadGatewayException, NotFoundException } from '@nestjs/common'
import { HttpService } from '@nestjs/axios'
import { of } from 'rxjs'
import { adminDb } from '../firebase'
import { JobsService, schedulerJobPath } from './jobs.service'

const jobsCollection = adminDb.collection('jobs') as any

describe('JobsService', () => {
  let service: JobsService
  let http: { post: jest.Mock }
  let update: jest.Mock

  const mockJobDoc = (data?: Record<string, unknown>) => {
    update = jest.fn().mockResolvedValue({ writeTime: new Date() })
    jobsCollection.doc = jest.fn().mockReturnValue({
      get: jest.fn().mockResolvedValue({ exists: !!data, data: () => data }),
      update,
    })
  }

  beforeEach(async () => {
    http = { post: jest.fn() }
    const module: TestingModule = await Test.createTestingModule({
      providers: [JobsService, { provide: HttpService, useValue: http }],
    }).compile()
    service = module.get(JobsService)
  })

  it('builds the Firebase onSchedule Cloud Scheduler job path', () => {
    expect(schedulerJobPath('notifySaleStat')).toBe(
      'projects/mock-project/locations/asia-southeast1/jobs/firebase-schedule-notifySaleStat-asia-southeast1',
    )
  })

  it('sets force and triggers the Cloud Scheduler job', async () => {
    mockJobDoc({ name: 'notifySaleStat' })
    http.post.mockReturnValue(of({ status: 200, data: {} }))

    const result = await service.run('job-1')

    expect(update).toHaveBeenCalledWith(
      expect.objectContaining({ force: true, triggeredAt: expect.any(Date) }),
    )
    expect(http.post).toHaveBeenCalledWith(
      `https://cloudscheduler.googleapis.com/v1/${schedulerJobPath('notifySaleStat')}:run`,
      {},
      expect.objectContaining({
        headers: { Authorization: 'Bearer mock-token' },
      }),
    )
    expect(result.triggeredAt).toEqual(expect.any(String))
  })

  it('throws NotFound for an unknown job without calling Cloud Scheduler', async () => {
    mockJobDoc(undefined)
    await expect(service.run('missing')).rejects.toBeInstanceOf(
      NotFoundException,
    )
    expect(http.post).not.toHaveBeenCalled()
  })

  it('clears force and throws BadGateway when Cloud Scheduler fails', async () => {
    mockJobDoc({ name: 'notifySaleStat' })
    http.post.mockReturnValue(
      of({ status: 403, data: { error: { message: 'Permission denied' } } }),
    )

    await expect(service.run('job-1')).rejects.toBeInstanceOf(
      BadGatewayException,
    )
    expect(update).toHaveBeenLastCalledWith({ force: false })
  })
})
