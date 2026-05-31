import Store from 'electron-store'
import { getEventsRange } from './database'

const store = new Store()

export async function syncEventsToNotion(): Promise<{ success: boolean; count: number; message: string }> {
  const token = store.get('settings.notion.token') as string
  const databaseId = store.get('settings.notion.databaseId') as string

  if (!token || !databaseId) {
    return {
      success: false,
      count: 0,
      message: 'رمز تكامل Notion أو معرف قاعدة البيانات غير مهيأ في الإعدادات.'
    }
  }

  try {
    // Fetch events for the next 60 days
    const now = new Date()
    const start = new Date(now.getFullYear(), now.getMonth() - 1, 1).toISOString()
    const end = new Date(now.getFullYear(), now.getMonth() + 2, 28).toISOString()
    
    const events = getEventsRange(start, end) as any[]
    if (events.length === 0) {
      return { success: true, count: 0, message: 'لا توجد أحداث أو امتحانات لرفعها في النطاق الحالي.' }
    }

    let syncedCount = 0

    // Loop through events and create pages in Notion database
    for (const event of events) {
      // Notion API request
      const response = await fetch('https://api.notion.com/v1/pages', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
          'Notion-Version': '2022-06-28'
        },
        body: JSON.stringify({
          parent: { database_id: databaseId },
          properties: {
            // Title (Name is standard default property key in Notion)
            'Name': {
              title: [
                {
                  text: {
                    content: event.title || 'حدث بدون عنوان'
                  }
                }
              ]
            },
            // Date property
            'Date': {
              date: {
                start: event.start_date.substring(0, 16),
                end: event.end_date ? event.end_date.substring(0, 16) : null
              }
            },
            // Description (Text)
            'Description': {
              rich_text: [
                {
                  text: {
                    content: event.description || ''
                  }
                }
              ]
            },
            // Type (Select)
            'Type': {
              select: {
                name: event.type || 'Personal'
              }
            }
          }
        })
      })

      if (response.ok) {
        syncedCount++
      } else {
        const errDetails = await response.text()
        console.error(`Notion sync failed for event: ${event.title}`, errDetails)
        
        // Try fallback: Only send Name/Title in case other properties are missing/mismatched in their DB
        const fallbackResponse = await fetch('https://api.notion.com/v1/pages', {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json',
            'Notion-Version': '2022-06-28'
          },
          body: JSON.stringify({
            parent: { database_id: databaseId },
            properties: {
              'Name': {
                title: [
                  {
                    text: {
                      content: `${event.title} (${event.type})`
                    }
                  }
                ]
              }
            }
          })
        })

        if (fallbackResponse.ok) {
          syncedCount++
        }
      }
    }

    return {
      success: true,
      count: syncedCount,
      message: `تمت مزامنة ${syncedCount} حدث بنجاح مع Notion!`
    }
  } catch (err: any) {
    console.error('Notion API sync error', err)
    return {
      success: false,
      count: 0,
      message: err.message || 'فشل الاتصال بخادم Notion. تحقق من اتصالك بالإنترنت.'
    }
  }
}
