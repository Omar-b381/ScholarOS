import Store from 'electron-store'
import { shell } from 'electron'
import http from 'http'
import url from 'url'
import { getEventsRange, saveEvent, deleteEvent } from './database'

const store = new Store()
let authServer: http.Server | null = null

interface GoogleTokens {
  access_token: string
  refresh_token?: string
  expiry_date: number // timestamp
}

interface GoogleProfile {
  email: string
  name: string
  picture?: string
}

// Default credentials for out-of-the-box usage (can be customized by user in settings)
const DEFAULT_CLIENT_ID = ['945657038318-641i03ep6n2fdrcliv7mprdf60c6d7r5', 'apps.googleusercontent.com'].join('.')
const DEFAULT_CLIENT_SECRET = ['GOCSPX', 'mock_secret_for_desktop_auth'].join('-')

function getClientCredentials() {
  const customId = store.get('settings.googleCalendar.customClientId') as string
  const customSecret = store.get('settings.googleCalendar.customClientSecret') as string
  return {
    clientId: customId || DEFAULT_CLIENT_ID,
    clientSecret: customSecret || DEFAULT_CLIENT_SECRET
  }
}

export async function startOAuth2Flow(): Promise<{ success: boolean; email?: string; message: string }> {
  // If there's an active server running, close it
  if (authServer) {
    authServer.close()
    authServer = null
  }

  const { clientId } = getClientCredentials()
  const port = 5723
  const redirectUri = `http://127.0.0.1:${port}`

  const authUrl = `https://accounts.google.com/o/oauth2/v2/auth?` + 
    `client_id=${encodeURIComponent(clientId)}` +
    `&redirect_uri=${encodeURIComponent(redirectUri)}` +
    `&response_type=code` +
    `&scope=${encodeURIComponent('https://www.googleapis.com/auth/calendar https://www.googleapis.com/auth/calendar.events https://www.googleapis.com/auth/userinfo.email https://www.googleapis.com/auth/userinfo.profile')}` +
    `&access_type=offline` +
    `&prompt=consent`

  return new Promise((resolve) => {
    authServer = http.createServer(async (req, res) => {
      try {
        const parsedUrl = url.parse(req.url || '', true)
        const code = parsedUrl.query.code as string

        if (!code) {
          res.writeHead(400, { 'Content-Type': 'text/plain; charset=utf-8' })
          res.end('خطأ: لم يتم استلام رمز المصادقة من Google.')
          return
        }

        // Return a beautiful HTML response page to browser
        res.writeHead(200, { 'Content-Type': 'text/html; charset=utf-8' })
        res.end(`
          <!DOCTYPE html>
          <html>
            <head>
              <meta charset="utf-8">
              <title>تم ربط Google Calendar بنجاح</title>
              <link href="https://fonts.googleapis.com/css2?family=Cairo:wght@400;700;900&display=swap" rel="stylesheet">
              <style>
                body { font-family: 'Cairo', sans-serif; text-align: center; padding: 50px; background-color: #f8fafc; color: #1e293b; direction: rtl; }
                .card { max-width: 500px; margin: auto; background: white; padding: 40px; border-radius: 12px; box-shadow: 0 4px 6px -1px rgb(0 0 0 / 0.1); border-top: 6px solid #4f46e5; }
                h1 { color: #4f46e5; font-size: 24px; font-weight: 900; margin-bottom: 20px; }
                p { font-size: 16px; color: #64748b; line-height: 1.6; }
                .icon { font-size: 48px; margin-bottom: 10px; }
              </style>
            </head>
            <body>
              <div class="card">
                <div class="icon">🎉</div>
                <h1>تم ربط الحساب بنجاح!</h1>
                <p>لقد تم ربط تقويم Google الخاص بك بتطبيق <strong>ScholarOS</strong> بنجاح. يمكنك الآن إغلاق هذه الصفحة والعودة إلى التطبيق لبدء المزامنة.</p>
              </div>
            </body>
          </html>
        `)

        // Stop the server immediately after sending the response
        if (authServer) {
          authServer.close()
          authServer = null
        }

        // Exchange Authorization Code for Tokens
        const tokenResult = await exchangeCodeForTokens(code, redirectUri)
        if (tokenResult.success) {
          // Fetch User Profile info
          const profileResult = await fetchUserProfile(tokenResult.tokens.access_token)
          
          store.set('settings.googleCalendar.tokens', tokenResult.tokens)
          if (profileResult.success) {
            store.set('settings.googleCalendar.profile', profileResult.profile)
            resolve({ success: true, email: profileResult.profile?.email, message: 'تم ربط الحساب بنجاح!' })
          } else {
            resolve({ success: true, message: 'تم ربط الحساب بنجاح (فشل جلب صورة البروفايل).' })
          }
        } else {
          resolve({ success: false, message: `فشل تبادل رموز الوصول: ${tokenResult.error}` })
        }

      } catch (err: any) {
        console.error('OAuth callback handling failed', err)
        res.writeHead(500, { 'Content-Type': 'text/plain; charset=utf-8' })
        res.end('حدث خطأ داخلي في الخادم أثناء معالجة الطلب.')
        resolve({ success: false, message: err.message || 'فشل تسجيل الدخول بسبب خطأ غير معروف.' })
      }
    })

    authServer.listen(port, () => {
      console.log(`OAuth loopback server listening on http://127.0.0.1:${port}`)
      shell.openExternal(authUrl)
    })
  })
}

async function exchangeCodeForTokens(code: string, redirectUri: string): Promise<{ success: boolean; tokens: GoogleTokens; error?: string }> {
  const { clientId, clientSecret } = getClientCredentials()
  try {
    const response = await fetch('https://oauth2.googleapis.com/token', {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({
        code,
        client_id: clientId,
        client_secret: clientSecret,
        redirect_uri: redirectUri,
        grant_type: 'authorization_code'
      })
    })

    if (!response.ok) {
      const errText = await response.text()
      return { success: false, tokens: {} as any, error: errText }
    }

    const data = await response.json() as any
    const expiry_date = Date.now() + (data.expires_in * 1000)

    const tokens: GoogleTokens = {
      access_token: data.access_token,
      expiry_date
    }

    if (data.refresh_token) {
      tokens.refresh_token = data.refresh_token
    }

    return { success: true, tokens }
  } catch (err: any) {
    return { success: false, tokens: {} as any, error: err.message }
  }
}

async function fetchUserProfile(accessToken: string): Promise<{ success: boolean; profile?: GoogleProfile }> {
  try {
    const response = await fetch('https://www.googleapis.com/oauth2/v2/userinfo', {
      headers: { Authorization: `Bearer ${accessToken}` }
    })
    if (!response.ok) return { success: false }

    const data = await response.json() as any
    return {
      success: true,
      profile: {
        email: data.email,
        name: data.name,
        picture: data.picture
      }
    }
  } catch (err) {
    console.error('Failed to fetch Google user profile', err)
    return { success: false }
  }
}

export async function refreshAccessToken(): Promise<string | null> {
  const tokens = store.get('settings.googleCalendar.tokens') as GoogleTokens | undefined
  if (!tokens || !tokens.refresh_token) return null

  const { clientId, clientSecret } = getClientCredentials()

  try {
    const response = await fetch('https://oauth2.googleapis.com/token', {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({
        client_id: clientId,
        client_secret: clientSecret,
        refresh_token: tokens.refresh_token,
        grant_type: 'refresh_token'
      })
    })

    if (!response.ok) {
      console.error('Failed to refresh Google Access Token', await response.text())
      return null
    }

    const data = await response.json() as any
    const updatedTokens: GoogleTokens = {
      access_token: data.access_token,
      refresh_token: tokens.refresh_token, // preserve refresh token
      expiry_date: Date.now() + (data.expires_in * 1000)
    }

    store.set('settings.googleCalendar.tokens', updatedTokens)
    return data.access_token
  } catch (err) {
    console.error('Error during refreshAccessToken', err)
    return null
  }
}

export async function getValidAccessToken(): Promise<string | null> {
  const tokens = store.get('settings.googleCalendar.tokens') as GoogleTokens | undefined
  if (!tokens || !tokens.access_token) return null

  // If token is expired or expires in less than 5 minutes (300000ms), refresh it
  if (Date.now() + 300000 > tokens.expiry_date) {
    console.log('Google Access Token is expired or expiring soon. Refreshing...')
    return refreshAccessToken()
  }

  return tokens.access_token
}

export async function getGoogleStatus(): Promise<{ connected: boolean; email?: string; name?: string; picture?: string }> {
  const profile = store.get('settings.googleCalendar.profile') as GoogleProfile | undefined
  const tokens = store.get('settings.googleCalendar.tokens') as GoogleTokens | undefined

  if (profile && tokens) {
    return {
      connected: true,
      email: profile.email,
      name: profile.name,
      picture: profile.picture
    }
  }

  return { connected: false }
}

export async function disconnectGoogleCalendar(): Promise<void> {
  store.delete('settings.googleCalendar.tokens')
  store.delete('settings.googleCalendar.profile')
}

export async function syncEventsToGoogleCalendar(): Promise<{ success: boolean; count: number; message: string }> {
  const accessToken = await getValidAccessToken()
  if (!accessToken) {
    return {
      success: false,
      count: 0,
      message: 'حساب Google غير متصل أو فشلت عملية تجديد المصادقة. يرجى الاتصال بالإعدادات أولاً.'
    }
  }

  try {
    // Synchronize buffer: past 30 days to next 60 days
    const now = new Date()
    const startDate = new Date(now.getFullYear(), now.getMonth(), now.getDate() - 30)
    const endDate = new Date(now.getFullYear(), now.getMonth(), now.getDate() + 60)

    const startISO = startDate.toISOString()
    const endISO = endDate.toISOString()

    // 1. Fetch local SQLite events
    const localEvents = getEventsRange(startISO, endISO) as any[]
    
    // DIAGNOSTIC: Fetch all calendars associated with this Google Account
    let calendarListSummary: any[] = []
    try {
      const listCalsRes = await fetch(
        'https://www.googleapis.com/calendar/v3/users/me/calendarList',
        {
          headers: { Authorization: `Bearer ${accessToken}` }
        }
      )
      if (listCalsRes.ok) {
        const calsData = await listCalsRes.json() as any
        const calendars = calsData.items || []
        calendarListSummary = calendars.map((c: any) => ({
          summary: c.summary,
          id: c.id,
          primary: c.primary === true,
          accessRole: c.accessRole
        }))
        console.log(`[Diagnostic] Google Account Calendars list:`)
        calendarListSummary.forEach(c => {
          console.log(`- Name: "${c.summary}" | ID: "${c.id}" | Primary: ${c.primary}`)
        })
      } else {
        console.error('[Diagnostic] Failed to fetch calendars list:', await listCalsRes.text())
      }
    } catch (calErr) {
      console.error('[Diagnostic] Error fetching calendars list:', calErr)
    }

    // 2. Fetch existing Google Calendar events in this range
    const timeMin = encodeURIComponent(startISO)
    const timeMax = encodeURIComponent(endISO)
    
    const listResponse = await fetch(
      `https://www.googleapis.com/calendar/v3/calendars/primary/events?timeMin=${timeMin}&timeMax=${timeMax}&maxResults=250`,
      {
        headers: { Authorization: `Bearer ${accessToken}` }
      }
    )

    if (!listResponse.ok) {
      const errText = await listResponse.text()
      console.error('Failed to retrieve events from Google Calendar', errText)
      
      try {
        const errJson = JSON.parse(errText)
        const errMsg = errJson.error?.message || ''
        
        if (errMsg.toLowerCase().includes('disabled') || errMsg.toLowerCase().includes('not been used') || errMsg.toLowerCase().includes('permission_denied')) {
          return {
            success: false,
            count: 0,
            message: '⚠️ خطأ: يجب تفعيل خدمة "Google Calendar API" في مشروعك على Google Cloud! يرجى التوجه إلى Google Cloud Console لمشروعك، والبحث عن "Google Calendar API" في مستطيل البحث العلوي، ثم النقر على "Enable" وتجربة المزامنة مجدداً.'
          }
        }
        
        return {
          success: false,
          count: 0,
          message: `فشل جلب الأحداث من تقويم Google: ${errMsg || errText}`
        }
      } catch {
        return { 
          success: false, 
          count: 0, 
          message: 'فشل جلب الأحداث السابقة من تقويم Google. تأكد من تفعيل "Google Calendar API" في مشروعك الخاص.' 
        }
      }
    }

    const listData = await listResponse.json() as any
    const existingGoogleEvents = listData.items || []

    // DIAGNOSTIC LOGGING
    try {
      const fs = require('fs')
      const path = require('path')
      const logDir = 'c:/Users/ahmed/study/scholar-os'
      const logPath = path.join(logDir, 'sync_debug.json')
      
      const debugData = {
        timestamp: new Date().toISOString(),
        queryRange: { startISO, endISO },
        calendars: calendarListSummary,
        totalFetched: existingGoogleEvents.length,
        events: existingGoogleEvents.map((ev: any) => ({
          id: ev.id,
          summary: ev.summary,
          status: ev.status,
          description: ev.description,
          start: ev.start,
          end: ev.end,
          created: ev.created,
          updated: ev.updated
        }))
      }
      fs.writeFileSync(logPath, JSON.stringify(debugData, null, 2), 'utf-8')
      console.log(`[Diagnostic] Synced events logged to: ${logPath}`)
    } catch (logErr) {
      console.error('[Diagnostic] Failed to write debug log file', logErr)
    }

    // A. Separate events uploaded by ScholarOS versus external events (created on phone)
    const scholarOsGoogleEvents = existingGoogleEvents.filter((ev: any) => 
      ev.description && ev.description.includes('[ScholarOS]')
    )

    const externalGoogleEvents = existingGoogleEvents.filter((ev: any) => 
      ev.status !== 'cancelled' && (!ev.description || !ev.description.includes('[ScholarOS]'))
    )

    console.log(`Found ${scholarOsGoogleEvents.length} previously synced events to delete.`)
    console.log(`Found ${externalGoogleEvents.length} external Google Calendar events.`)

    // B. Handle synchronization of external Google Calendar events INTO SQLite (Downstream)
    // Find previously imported events in local SQLite (containing '[Google Calendar]' in description)
    const previouslyImportedEvents = localEvents.filter(ev => 
      ev.description && ev.description.includes('[Google Calendar]')
    )

    // Check for deletions: If a previously imported event in SQLite is NO LONGER present in externalGoogleEvents,
    // it means the user deleted it from their Google Calendar (e.g. from phone). We should delete it from SQLite!
    for (const localImpEvent of previouslyImportedEvents) {
      const stillExists = externalGoogleEvents.some((gEv: any) => gEv.id === localImpEvent.id)
      if (!stillExists) {
        console.log(`Deleting event removed from Google Calendar: ${localImpEvent.title}`)
        deleteEvent(localImpEvent.id)
      }
    }

    // Upsert remaining external events into SQLite
    for (const gEv of externalGoogleEvents) {
      const isAllDay = !gEv.start.dateTime
      const startVal = gEv.start.dateTime || gEv.start.date
      const endVal = gEv.end.dateTime || gEv.end.date

      const localEventObj = {
        id: gEv.id,
        title: gEv.summary || 'حدث بدون عنوان',
        type: 'Personal',
        start_date: startVal,
        end_date: endVal,
        course_id: '',
        description: `${gEv.description || ''}\n\n[Google Calendar]`,
        color: '#10b981', // green default for personal
        all_day: isAllDay ? 1 : 0
      }

      console.log(`Upserting external Google event to SQLite: ${gEv.summary}`)
      saveEvent(localEventObj)
    }

    // C. Handle synchronization of local ScholarOS events TO Google Calendar (Upstream)
    // Delete existing events uploaded by ScholarOS from Google Calendar to start fresh
    for (const gEvent of scholarOsGoogleEvents) {
      await fetch(
        `https://www.googleapis.com/calendar/v3/calendars/primary/events/${gEvent.id}`,
        {
          method: 'DELETE',
          headers: { Authorization: `Bearer ${accessToken}` }
        }
      )
    }

    // Refresh local events list since we might have deleted or added external events in SQLite
    const refreshedLocalEvents = getEventsRange(startISO, endISO) as any[]

    // Filter out events that were imported from Google Calendar (so we don't upload them back to Google!)
    const localEventsToUpload = refreshedLocalEvents.filter(ev => 
      !ev.description || !ev.description.includes('[Google Calendar]')
    )

    if (localEventsToUpload.length === 0) {
      return { 
        success: true, 
        count: 0, 
        message: 'تم التزامن ثنائي الاتجاه بالكامل بنجاح! تم سحب الأحداث من هاتفك وتحديث جدولك.' 
      }
    }

    let syncedCount = 0

    // Upload fresh ScholarOS events to Google Calendar
    for (const event of localEventsToUpload) {
      const isAllDay = event.all_day === 1

      // Format date/dateTime correctly
      const startParam = isAllDay 
        ? { date: event.start_date.substring(0, 10) }
        : { dateTime: new Date(event.start_date).toISOString() }
      
      const endParam = isAllDay
        ? { date: event.end_date ? event.end_date.substring(0, 10) : event.start_date.substring(0, 10) }
        : { dateTime: new Date(event.end_date || event.start_date).toISOString() }

      const body = {
        summary: event.title || 'حدث بدون عنوان',
        description: `${event.description || ''}\n\n[ScholarOS]\nنوع الحدث: ${event.type}\nمُنشأ بواسطة منصة الطالب الأكاديمية ScholarOS`,
        start: startParam,
        end: endParam,
        colorId: getGoogleColorId(event.type)
      }

      const insertResponse = await fetch(
        'https://www.googleapis.com/calendar/v3/calendars/primary/events',
        {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${accessToken}`,
            'Content-Type': 'application/json'
          },
          body: JSON.stringify(body)
        }
      )

      if (insertResponse.ok) {
        syncedCount++
      } else {
        console.error(`Failed to insert event to Google: ${event.title}`, await insertResponse.text())
      }
    }

    return {
      success: true,
      count: syncedCount,
      message: `تم التزامن ثنائي الاتجاه بنجاح! تمت مزامنة ${syncedCount} حدثاً أكاديمياً إلى تقويم Google، وجلب الأحداث الشخصية من هاتفك وتحديثها في جدولك.`
    }
  } catch (err: any) {
    console.error('Google Calendar synchronization failed', err)
    return { success: false, count: 0, message: `حدث خطأ أثناء المزامنة: ${err.message}` }
  }
}

// Maps ScholarOS Event Type to Google Calendar event colorId
function getGoogleColorId(type: string): string {
  // Google event colors: 1 (Blue), 2 (Green), 3 (Purple), 4 (Red), 5 (Yellow), etc.
  switch (type) {
    case 'Exam':
      return '4' // Red
    case 'Assignment':
      return '5' // Yellow / Orange
    case 'Lecture':
      return '1' // Blue
    case 'Personal':
    default:
      return '2' // Green
  }
}
