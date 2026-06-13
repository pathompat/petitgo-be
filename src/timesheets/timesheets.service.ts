import { Inject, Injectable, NotFoundException } from '@nestjs/common'
import { REQUEST } from '@nestjs/core'
import { adminDb } from '../firebase'
import { CreateTimesheetDto } from './dto/create-timesheet.dto'
import { UpdateTimesheetDto } from './dto/update-timesheet.dto'

@Injectable()
export class TimesheetsService {
  private readonly col = adminDb.collection('timesheets')

  constructor(@Inject(REQUEST) private readonly req: { user: any }) {}

  async create(dto: CreateTimesheetDto) {
    const { uid, username } = this.req.user
    const data = {
      type: dto.type,
      startAt: dto.startAt,
      endAt: dto.endAt,
      remark: dto.remark ?? '',
      status: 'REQUESTED',
      userRef: uid,
      requesterName: username,
      approverRef: null,
      approverName: null,
      approvedAt: null,
      createdAt: new Date().toISOString(),
    }
    const doc = await this.col.add(data)
    return { id: doc.id, ...data }
  }

  async findAll(status?: string) {
    const { uid, role } = this.req.user
    const isAdmin = role === 'ADMIN' || role === 'admin'

    let query: FirebaseFirestore.Query = this.col

    if (!isAdmin) {
      const userSnap = await adminDb
        .collection('users')
        .where('uid', '==', uid)
        .get()
      if (userSnap.empty) return []
      const userRef = userSnap.docs[0].ref
      query = query.where('userRef', 'in', [userRef, uid])
    }

    if (status) query = query.where('status', '==', status)

    const snap = await query.get()
    return snap.docs
      .map((d) => ({ id: d.id, ...(d.data() as object) }))
      .sort((a: any, b: any) => (b.createdAt > a.createdAt ? 1 : -1))
  }

  async getStat(year: number, month: number) {
    const { uid, role } = this.req.user
    const isAdmin = role === 'ADMIN' || role === 'admin'

    let query: FirebaseFirestore.Query = this.col
    if (!isAdmin) {
      query = query.where('userRef', '==', uid)
    }

    const snap = await query.get()

    const start = new Date(year, month - 1, 1).getTime()
    const end = new Date(year, month, 1).getTime()

    const docs = snap.docs
      .map((d) => d.data())
      .filter((d) => {
        const t = d.startAt ? new Date(d.startAt as string).getTime() : 0
        return t >= start && t < end
      })

    return {
      total: docs.length,
      approved: docs.filter(
        (d) => d.status === 'APPROVED' || d.status === 'SETTLED',
      ).length,
      waiting: docs.filter((d) => d.status === 'REQUESTED').length,
      rejected: docs.filter((d) => d.status === 'REJECTED').length,
    }
  }

  async update(id: string, dto: UpdateTimesheetDto) {
    const { uid, username } = this.req.user
    const ref = this.col.doc(id)
    const snap = await ref.get()
    if (!snap.exists) throw new NotFoundException('Timesheet not found')
    const updates: Record<string, any> = {
      status: dto.status,
      approverRef: uid,
      approverName: username,
      approvedAt: new Date().toISOString(),
    }
    if (dto.remark !== undefined) updates.remark = dto.remark
    await ref.update(updates)
    return { id, ...snap.data(), ...updates }
  }

  async remove(id: string) {
    const ref = this.col.doc(id)
    const snap = await ref.get()
    if (!snap.exists) throw new NotFoundException('Timesheet not found')
    await ref.delete()
    return { id }
  }
}
