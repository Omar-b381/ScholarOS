import Store from 'electron-store'
import OpenAI from 'openai'
import Anthropic from '@anthropic-ai/sdk'
import { GoogleGenerativeAI } from '@google/generative-ai'
import Groq from 'groq-sdk'
import ollama from 'ollama'

const store = new Store()

interface ChatAttachment {
  data: string // base64 string
  mimeType: string
}

interface ChatArgs {
  provider: string
  model: string
  systemPrompt: string
  messages: any[] // { role: 'user' | 'assistant', content: string }
  files?: ChatAttachment[]
}

export async function processAIChat(args: ChatArgs): Promise<string> {
  const { provider, model, systemPrompt, messages, files } = args

  switch (provider.toLowerCase()) {
    case 'openai':
      return callOpenAI(model, systemPrompt, messages, files)
    case 'anthropic':
      return callAnthropic(model, systemPrompt, messages, files)
    case 'gemini':
      return callGemini(model, systemPrompt, messages, files)
    case 'groq':
      return callGroq(model, systemPrompt, messages, files)
    case 'ollama':
      return callOllama(model, systemPrompt, messages, files)
    case 'openrouter':
      return callOpenRouter(model, systemPrompt, messages, files)
    case 'custom':
      return callCustomAI(model, systemPrompt, messages, files)
    default:
      throw new Error(`AI Provider ${provider} is not supported`)
  }
}

// OpenAI API Call
async function callOpenAI(model: string, systemPrompt: string, messages: any[], files?: ChatAttachment[]): Promise<string> {
  const apiKey = store.get('settings.ai.keys.openai') as string
  if (!apiKey) throw new Error('مفتاح API الخاص بـ OpenAI غير مهيأ. يرجى إدخاله في الإعدادات.')

  const openai = new OpenAI({ apiKey })

  const formattedMessages: any[] = [
    { role: 'system', content: systemPrompt }
  ]

  // Add dialogue history
  for (let i = 0; i < messages.length; i++) {
    const msg = messages[i]
    // If it's the last message and there are files, attach them
    if (i === messages.length - 1 && files && files.length > 0) {
      const contentArray: any[] = [{ type: 'text', text: msg.content }]
      for (const file of files) {
        contentArray.push({
          type: 'image_url',
          image_url: {
            url: `data:${file.mimeType};base64,${file.data}`
          }
        })
      }
      formattedMessages.push({ role: msg.role, content: contentArray })
    } else {
      formattedMessages.push({ role: msg.role, content: msg.content })
    }
  }

  const response = await openai.chat.completions.create({
    model: model || 'gpt-4o',
    messages: formattedMessages
  })

  return response.choices[0]?.message?.content || ''
}

// Anthropic Claude API Call
async function callAnthropic(model: string, systemPrompt: string, messages: any[], files?: ChatAttachment[]): Promise<string> {
  const apiKey = store.get('settings.ai.keys.anthropic') as string
  if (!apiKey) throw new Error('مفتاح API الخاص بـ Anthropic غير مهيأ. يرجى إدخاله في الإعدادات.')

  const anthropic = new Anthropic({ apiKey })

  const formattedMessages: any[] = []

  for (let i = 0; i < messages.length; i++) {
    const msg = messages[i]
    if (i === messages.length - 1 && files && files.length > 0) {
      const contentArray: any[] = [{ type: 'text', text: msg.content }]
      for (const file of files) {
        // Claude only supports image/jpeg, image/png, image/gif, and image/webp base64 directly
        let mime = file.mimeType
        if (mime === 'image/jpg') mime = 'image/jpeg'
        contentArray.push({
          type: 'image',
          source: {
            type: 'base64',
            media_type: mime,
            data: file.data
          }
        })
      }
      formattedMessages.push({ role: msg.role === 'assistant' ? 'assistant' : 'user', content: contentArray })
    } else {
      formattedMessages.push({ role: msg.role === 'assistant' ? 'assistant' : 'user', content: msg.content })
    }
  }

  const response = await anthropic.messages.create({
    model: model || 'claude-3-5-sonnet-20240620',
    system: systemPrompt,
    max_tokens: 4096,
    messages: formattedMessages
  })

  // Extract text content from blocks
  const textContent = response.content
    .filter(block => block.type === 'text')
    .map(block => (block as any).text)
    .join('\n')

  return textContent
}

// Google Gemini API Call
async function callGemini(model: string, systemPrompt: string, messages: any[], files?: ChatAttachment[]): Promise<string> {
  const apiKey = store.get('settings.ai.keys.gemini') as string
  if (!apiKey) throw new Error('مفتاح API الخاص بـ Google Gemini غير مهيأ. يرجى إدخاله في الإعدادات.')

  const genAI = new GoogleGenerativeAI(apiKey)
  const geminiModel = genAI.getGenerativeModel({
    model: model || 'gemini-1.5-flash',
    systemInstruction: systemPrompt
  })

  // Convert conversation messages to Gemini's content format
  const chatSession = geminiModel.startChat({
    history: messages.slice(0, -1).map(msg => ({
      role: msg.role === 'assistant' ? 'model' : 'user',
      parts: [{ text: msg.content }]
    }))
  })

  const lastMsg = messages[messages.length - 1]
  const promptParts: any[] = [lastMsg.content]

  if (files && files.length > 0) {
    for (const file of files) {
      promptParts.push({
        inlineData: {
          data: file.data,
          mimeType: file.mimeType
        }
      })
    }
  }

  const result = await chatSession.sendMessage(promptParts)
  return result.response.text()
}

// Groq API Call
async function callGroq(model: string, systemPrompt: string, messages: any[], files?: ChatAttachment[]): Promise<string> {
  const apiKey = store.get('settings.ai.keys.groq') as string
  if (!apiKey) throw new Error('مفتاح API الخاص بـ Groq غير مهيأ. يرجى إدخاله في الإعدادات.')

  const groq = new Groq({ apiKey })

  const formattedMessages: any[] = [
    { role: 'system', content: systemPrompt }
  ]

  for (let i = 0; i < messages.length; i++) {
    const msg = messages[i]
    if (i === messages.length - 1 && files && files.length > 0) {
      // Vision model support in Groq
      const contentArray: any[] = [{ type: 'text', text: msg.content }]
      for (const file of files) {
        contentArray.push({
          type: 'image_url',
          image_url: {
            url: `data:${file.mimeType};base64,${file.data}`
          }
        })
      }
      formattedMessages.push({ role: msg.role, content: contentArray })
    } else {
      formattedMessages.push({ role: msg.role, content: msg.content })
    }
  }

  const response = await groq.chat.completions.create({
    model: model || 'llama-3.1-70b-versatile',
    messages: formattedMessages
  })

  return response.choices[0]?.message?.content || ''
}

// Ollama API Call (Local)
async function callOllama(model: string, systemPrompt: string, messages: any[], files?: ChatAttachment[]): Promise<string> {
  // Check if Ollama service is reachable. Default address is http://127.0.0.1:11434
  const formattedMessages: any[] = [
    { role: 'system', content: systemPrompt }
  ]

  for (let i = 0; i < messages.length; i++) {
    const msg = messages[i]
    if (i === messages.length - 1 && files && files.length > 0) {
      formattedMessages.push({
        role: msg.role,
        content: msg.content,
        images: files.map(f => f.data) // array of base64 strings
      })
    } else {
      formattedMessages.push({ role: msg.role, content: msg.content })
    }
  }

  const response = await ollama.chat({
    model: model || 'llama3',
    messages: formattedMessages
  })

  return response.message.content || ''
}

// OpenRouter API Call
async function callOpenRouter(model: string, systemPrompt: string, messages: any[], files?: ChatAttachment[]): Promise<string> {
  const apiKey = store.get('settings.ai.keys.openrouter') as string
  if (!apiKey) throw new Error('مفتاح API الخاص بـ OpenRouter غير مهيأ. يرجى إدخاله في الإعدادات.')

  // OpenRouter is OpenAI-compatible
  const openrouter = new OpenAI({
    apiKey,
    baseURL: 'https://openrouter.ai/api/v1',
    defaultHeaders: {
      'HTTP-Referer': 'https://scholaros.local',
      'X-Title': 'ScholarOS'
    }
  })

  const formattedMessages: any[] = [
    { role: 'system', content: systemPrompt }
  ]

  for (let i = 0; i < messages.length; i++) {
    const msg = messages[i]
    if (i === messages.length - 1 && files && files.length > 0) {
      const contentArray: any[] = [{ type: 'text', text: msg.content }]
      for (const file of files) {
        contentArray.push({
          type: 'image_url',
          image_url: {
            url: `data:${file.mimeType};base64,${file.data}`
          }
        })
      }
      formattedMessages.push({ role: msg.role, content: contentArray })
    } else {
      formattedMessages.push({ role: msg.role, content: msg.content })
    }
  }

  const response = await openrouter.chat.completions.create({
    model: model || 'openrouter/auto',
    messages: formattedMessages
  })

  return response.choices[0]?.message?.content || ''
}

// Custom OpenAI-Compatible API Call
async function callCustomAI(model: string, systemPrompt: string, messages: any[], files?: ChatAttachment[]): Promise<string> {
  const apiKey = store.get('settings.ai.custom.apiKey') as string
  const baseURL = store.get('settings.ai.custom.baseUrl') as string
  const customModel = store.get('settings.ai.custom.model') as string

  if (!baseURL) throw new Error('يرجى تحديد عنوان الرابط الأساسي (Base URL) لمزود الخدمة المخصص في الإعدادات.')

  const customClient = new OpenAI({
    apiKey: apiKey || 'no-key',
    baseURL: baseURL
  })

  const formattedMessages: any[] = [
    { role: 'system', content: systemPrompt }
  ]

  for (let i = 0; i < messages.length; i++) {
    const msg = messages[i]
    if (i === messages.length - 1 && files && files.length > 0) {
      const contentArray: any[] = [{ type: 'text', text: msg.content }]
      for (const file of files) {
        contentArray.push({
          type: 'image_url',
          image_url: {
            url: `data:${file.mimeType};base64,${file.data}`
          }
        })
      }
      formattedMessages.push({ role: msg.role, content: contentArray })
    } else {
      formattedMessages.push({ role: msg.role, content: msg.content })
    }
  }

  const response = await customClient.chat.completions.create({
    model: customModel || model || 'gpt-4o',
    messages: formattedMessages
  })

  return response.choices[0]?.message?.content || ''
}
