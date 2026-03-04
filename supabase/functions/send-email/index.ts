import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

serve(async (req) => {
  // Handle CORS preflight request
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const { to, subject, html, text } = await req.json()

    if (!to || !subject) {
      throw new Error('Missing required fields: to or subject')
    }

    const RESEND_API_KEY = Deno.env.get('RESEND_API_KEY')
    
    if (!RESEND_API_KEY) {
      // In development, if no API key is set, log instead of failing.
      console.log('Would send email to:', to)
      console.log('Subject:', subject)
      return new Response(
        JSON.stringify({ message: "Development mode: Email logged securely but not sent (Missing API Key)." }),
        {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          status: 200,
        }
      )
    }

    // Call Resend API (You can change this to SendGrid or SMTP)
    const res = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${RESEND_API_KEY}`,
      },
      body: JSON.stringify({
        from: 'Valley Care Clinic <notifications@resend.dev>', // Update with your own verified domain
        to: [to],
        subject: subject,
        html: html,
        text: text,
      }),
    })

    const data = await res.json()

    if (res.ok) {
        return new Response(JSON.stringify(data), {
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
            status: 200,
        })
    } else {
        return new Response(JSON.stringify({ error: data }), {
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
            status: res.status,
        })
    }

  } catch (error) {
    return new Response(JSON.stringify({ error: error.message }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 400,
    })
  }
})
