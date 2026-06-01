// citation-js must run in main process (Node.js env)
// Renderer sends resource data → main converts → returns formatted string

const Cite = require('citation-js')
require('@citation-js/plugin-bibtex')
require('@citation-js/plugin-ris')

export interface CitationInput {
  title:   string
  url?:    string
  author?: string
  year?:   number
  journal?:string
  doi?:    string
}

// Generate citation in requested format
export function formatCitation(input: CitationInput, format: 'apa' | 'mla' | 'bibtex' | 'ris'): string {
  const data: any = {
    type:         'article',
    title:        input.title,
    URL:          input.url,
    DOI:          input.doi,
    issued:       input.year ? { 'date-parts': [[input.year]] } : undefined,
    author:       input.author ? [{ literal: input.author }] : undefined,
    'container-title': input.journal,
  }

  try {
    const cite = new Cite(data)

    switch (format) {
      case 'apa':
        return cite.format('bibliography', {
          format: 'text', template: 'apa', lang: 'ar'
        })
      case 'mla':
        return cite.format('bibliography', {
          format: 'text', template: 'mla', lang: 'ar'
        })
      case 'bibtex':
        return cite.format('bibtex')
      case 'ris':
        return cite.format('ris')
      default:
        return cite.format('bibliography', { format: 'text', template: 'apa' })
    }
  } catch (err) {
    console.error('Failed to format citation', err)
    return `فشل توليد الاستشهاد بالنمط المختار للمرجع: ${input.title}`
  }
}

// Fetch citation data from DOI using CrossRef (free API)
export async function fetchByDOI(doi: string): Promise<CitationInput | null> {
  try {
    const res = await fetch(`https://api.crossref.org/works/${encodeURIComponent(doi)}`)
    if (!res.ok) return null
    const json = await res.json()
    const work = json.message
    return {
      title:   work.title?.[0] ?? '',
      author:  work.author?.map((a: any) => `${a.given ?? ''} ${a.family ?? ''}`).join(', '),
      year:    work.published?.['date-parts']?.[0]?.[0],
      journal: work['container-title']?.[0],
      doi:     work.DOI,
      url:     work.URL,
    }
  } catch (err) {
    console.error('Failed to fetch CrossRef DOI', err)
    return null
  }
}

// Import a .bib file and return array of CitationInput
export function parseBibFile(content: string): CitationInput[] {
  try {
    const cite = new Cite(content)
    return cite.data.map((item: any) => ({
      title:   item.title ?? '',
      author:  item.author?.map((a: any) => `${a.given ?? ''} ${a.family ?? ''}`).join(', '),
      year:    item.issued?.['date-parts']?.[0]?.[0],
      journal: item['container-title'],
      doi:     item.DOI,
      url:     item.URL,
    }))
  } catch (err) {
    console.error('Failed to parse BibTeX file', err)
    return []
  }
}
