export const adminAuth = {
  verifyIdToken: jest.fn(),
}

const mockCollection = {
  add: jest.fn().mockResolvedValue({ id: 'mock-id' }),
  get: jest.fn().mockResolvedValue({ empty: true, docs: [] }),
  where: jest.fn().mockReturnValue({
    get: jest.fn().mockResolvedValue({ empty: true, docs: [] }),
  }),
  doc: jest.fn().mockReturnValue({
    update: jest.fn().mockResolvedValue({ writeTime: new Date() }),
  }),
}

export const adminDb = {
  collection: jest.fn().mockReturnValue(mockCollection),
}

export const adminCredential = {
  getAccessToken: jest
    .fn()
    .mockResolvedValue({ access_token: 'mock-token', expires_in: 3600 }),
}

export const projectId = 'mock-project'

export const adminBucketName = 'mock-bucket.appspot.com'

export const adminBucket = {
  file: jest.fn().mockReturnValue({
    save: jest.fn().mockResolvedValue(undefined),
  }),
}
