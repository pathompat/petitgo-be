export class Cookie {
  cookie: string
  updatedAt: Date
}

/** A `cookies` document as returned by the admin cookie endpoints */
export class CookieDocument {
  id: string
  cookie: string
  updatedAt: string | null
  latestNotifiedAt: string | null
}
