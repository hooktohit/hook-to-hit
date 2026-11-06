import type { Config } from '@netlify/functions'
import Razorpay from 'razorpay'

// Course price in paise (₹29 = 2900). The amount is fixed on the server so a
// buyer cannot change it from the browser. Override with COURSE_PRICE_PAISE.
const DEFAULT_PRICE_PAISE = 2900
const MIN_AMOUNT_PAISE = 100

export default async (req: Request) => {
  const keyId = Netlify.env.get('RAZORPAY_KEY_ID')
  const keySecret = Netlify.env.get('RAZORPAY_KEY_SECRET')
  if (!keyId || !keySecret) {
    return Response.json({ error: 'Payments are not configured yet.' }, { status: 500 })
  }

  const amount = Number(Netlify.env.get('COURSE_PRICE_PAISE') || DEFAULT_PRICE_PAISE)
  if (!Number.isInteger(amount) || amount < MIN_AMOUNT_PAISE) {
    return Response.json({ error: `Amount must be at least ${MIN_AMOUNT_PAISE} paise.` }, { status: 400 })
  }

  const currency = 'INR'
  const receipt = `h2h_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`

  try {
    const razorpay = new Razorpay({ key_id: keyId, key_secret: keySecret })
    const order = await razorpay.orders.create({ amount, currency, receipt })
    // key_id is public and safe to send to the browser; the secret never leaves the server.
    return Response.json({ order_id: order.id, amount: order.amount, currency: order.currency, key_id: keyId })
  } catch (err: any) {
    const status = err?.statusCode
    console.error('Razorpay order creation failed', status, err?.error?.description || err?.message)
    if (status === 401) {
      return Response.json({ error: 'Payment provider authentication failed.' }, { status: 401 })
    }
    return Response.json({ error: 'Could not start the payment. Please try again.' }, { status: 500 })
  }
}

export const config: Config = {
  path: '/api/create-order',
  method: 'POST',
}
