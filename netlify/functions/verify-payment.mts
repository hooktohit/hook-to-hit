import type { Config } from '@netlify/functions'
import { createHmac, timingSafeEqual } from 'node:crypto'

export default async (req: Request) => {
  const keySecret = Netlify.env.get('RAZORPAY_KEY_SECRET')
  if (!keySecret) {
    return Response.json({ error: 'Payments are not configured yet.' }, { status: 500 })
  }

  let body: Record<string, unknown>
  try {
    body = await req.json()
  } catch {
    return Response.json({ error: 'Invalid request body.' }, { status: 400 })
  }

  const orderId = body.razorpay_order_id
  const paymentId = body.razorpay_payment_id
  const signature = body.razorpay_signature
  if (typeof orderId !== 'string' || typeof paymentId !== 'string' || typeof signature !== 'string' || !orderId || !paymentId || !signature) {
    return Response.json({ error: 'Missing razorpay_order_id, razorpay_payment_id or razorpay_signature.' }, { status: 400 })
  }

  const expected = createHmac('sha256', keySecret).update(`${orderId}|${paymentId}`).digest('hex')
  const a = Buffer.from(expected, 'utf8')
  const b = Buffer.from(signature, 'utf8')
  if (a.length !== b.length || !timingSafeEqual(a, b)) {
    return Response.json({ success: false, error: 'Payment signature mismatch.' }, { status: 400 })
  }

  // Signature is valid: the payment is genuine. If ACCESS_CODE is set, hand the
  // buyer their course code so they can unlock on other devices too.
  const accessCode = Netlify.env.get('ACCESS_CODE') || null
  return Response.json({ success: true, payment_id: paymentId, order_id: orderId, access_code: accessCode })
}

export const config: Config = {
  path: '/api/verify-payment',
  method: 'POST',
}
