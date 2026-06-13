/**
 * Post a slip to a Discord channel via an Incoming Webhook: the description
 * becomes the message caption and the slip image is attached as a photo.
 *
 * Uses the webhook's multipart/form-data form (`payload_json` + `files[n]`) so
 * the image renders inline. If the image bytes are unavailable, the image URL
 * is appended to the caption instead so Discord can still unfurl a preview.
 */
export async function sendSlipToDiscord(opts: {
  webhookUrl: string
  caption: string
  imageBuffer: Buffer | null
  filename: string
  fallbackImageUrl?: string
}): Promise<void> {
  const { webhookUrl, caption, imageBuffer, filename, fallbackImageUrl } = opts

  const form = new FormData()

  if (imageBuffer && imageBuffer.length) {
    form.append('payload_json', JSON.stringify({ content: caption || '' }))
    form.append('files[0]', new Blob([imageBuffer]), filename)
  } else {
    const content = [caption, fallbackImageUrl].filter(Boolean).join('\n')
    form.append('payload_json', JSON.stringify({ content }))
  }

  const res = await fetch(webhookUrl, { method: 'POST', body: form })
  if (!res.ok) {
    const body = await res.text().catch(() => '')
    throw new Error(`Discord webhook responded ${res.status}: ${body}`)
  }
}
