import { Jimp } from 'jimp'
import jsQR from 'jsqr'
import { parse } from 'promptparse'

export interface SlipQrResult {
  /** Raw QR string decoded from the image, or null if no QR was found. */
  raw: string | null
  /** Transaction amount (EMVCo tag 54). Thai transfer-slip QRs do not carry an
   *  amount, so this is only set for payment QRs that embed a fixed amount. */
  totalAmount: number | null
  /** Sending bank code from the slip-verify QR (tag 00 → sub-tag 01). */
  sendingBank: string | null
  /** Transaction reference from the slip-verify QR (tag 00 → sub-tag 02). */
  transRef: string | null
}

const EMPTY: SlipQrResult = {
  raw: null,
  totalAmount: null,
  sendingBank: null,
  transRef: null,
}

/**
 * Decode the QR code embedded in a Thai bank slip image and parse it with the
 * EMVCo / PromptPay slip format (promptparse).
 *
 * Note: a Thai transfer-slip QR encodes the sending bank + transaction
 * reference, not the amount — verifying the amount requires an external bank
 * slip-verification API. We therefore extract the amount only when the QR is a
 * payment QR that carries EMVCo tag 54; otherwise `totalAmount` stays null.
 */
export async function extractSlipFromImage(
  buffer: Buffer,
): Promise<SlipQrResult> {
  const raw = await decodeQr(buffer)
  if (!raw) return { ...EMPTY }

  const result: SlipQrResult = { ...EMPTY, raw }
  try {
    const parsed = parse(raw)
    if (parsed) {
      const amount = parsed.getTagValue('54')
      if (amount && !isNaN(parseFloat(amount))) {
        result.totalAmount = parseFloat(amount)
      }
      const root = parsed.getTag('00')
      const subTags = (root as { subTags?: { id: string; value: string }[] })
        ?.subTags
      if (Array.isArray(subTags)) {
        result.sendingBank = subTags.find((t) => t.id === '01')?.value ?? null
        result.transRef = subTags.find((t) => t.id === '02')?.value ?? null
      }
    }
  } catch {
    // Not a parseable EMVCo/PromptPay payload — keep the raw string only.
  }
  return result
}

/** Read pixel data with Jimp and decode a QR; retry once with a contrast pass. */
async function decodeQr(buffer: Buffer): Promise<string | null> {
  let image: Awaited<ReturnType<typeof Jimp.read>>
  try {
    image = await Jimp.read(buffer)
  } catch {
    return null
  }

  const scan = (bitmap: {
    data: Buffer
    width: number
    height: number
  }): string | null => {
    const code = jsQR(
      new Uint8ClampedArray(bitmap.data),
      bitmap.width,
      bitmap.height,
    )
    return code?.data ?? null
  }

  const first = scan(image.bitmap)
  if (first) return first

  // Some slips have low-contrast QR codes; greyscale + contrast helps jsQR.
  try {
    const enhanced = image.greyscale().contrast(0.5)
    return scan(enhanced.bitmap)
  } catch {
    return null
  }
}
