import { app, shell, BrowserWindow } from 'electron'
import path from 'path'
import fs from 'fs'
import { PDFDocument } from 'pdf-lib'
import sharp from 'sharp'
import * as cheerio from 'cheerio'

export function getDocumentsDir() {
  const docsDir = path.join(app.getPath('userData'), 'documents')
  if (!fs.existsSync(docsDir)) {
    fs.mkdirSync(docsDir, { recursive: true })
  }
  return docsDir
}

export async function uploadPDF(sourcePath: string, destName: string) {
  const docsDir = getDocumentsDir()
  const destPath = path.join(docsDir, destName)

  // Ensure unique filename if collisions
  let finalPath = destPath
  let count = 1
  const ext = path.extname(destName)
  const base = path.basename(destName, ext)
  while (fs.existsSync(finalPath)) {
    finalPath = path.join(docsDir, `${base}_${count}${ext}`)
    count++
  }

  fs.copyFileSync(sourcePath, finalPath)
  return {
    success: true,
    path: finalPath,
    name: path.basename(finalPath)
  }
}

export async function listPDFs() {
  const docsDir = getDocumentsDir()
  const files = fs.readdirSync(docsDir)
  const pdfs: any[] = []

  for (const file of files) {
    if (file.toLowerCase().endsWith('.pdf')) {
      const filePath = path.join(docsDir, file)
      const stats = fs.statSync(filePath)
      pdfs.push({
        name: file,
        path: filePath,
        size: stats.size,
        updated_at: stats.mtime.toISOString()
      })
    }
  }
  return pdfs
}

export async function openPDF(filePath: string) {
  const err = await shell.openPath(filePath)
  return !err
}

export async function convertImagesToPDF(imagesPaths: string[]) {
  const pdfDoc = await PDFDocument.create()
  const docsDir = getDocumentsDir()

  for (const imgPath of imagesPaths) {
    if (!fs.existsSync(imgPath)) continue
    const imgBytes = fs.readFileSync(imgPath)
    const ext = path.extname(imgPath).toLowerCase()

    let embeddedImg
    if (ext === '.png') {
      embeddedImg = await pdfDoc.embedPng(imgBytes)
    } else if (ext === '.jpg' || ext === '.jpeg') {
      embeddedImg = await pdfDoc.embedJpg(imgBytes)
    } else {
      // For other formats (webp, etc.), pre-convert to PNG using sharp
      const convertedBytes = await sharp(imgPath).png().toBuffer()
      embeddedImg = await pdfDoc.embedPng(convertedBytes)
    }

    const page = pdfDoc.addPage([embeddedImg.width, embeddedImg.height])
    page.drawImage(embeddedImg, {
      x: 0,
      y: 0,
      width: embeddedImg.width,
      height: embeddedImg.height
    })
  }

  const pdfBytes = await pdfDoc.save()
  const fileName = `images_converted_${Date.now()}.pdf`
  const destPath = path.join(docsDir, fileName)
  fs.writeFileSync(destPath, pdfBytes)

  return { success: true, filePath: destPath }
}

export async function mergePDFs(pdfPaths: string[]) {
  const mergedPdf = await PDFDocument.create()
  const docsDir = getDocumentsDir()

  for (const pdfPath of pdfPaths) {
    if (!fs.existsSync(pdfPath)) continue
    const pdfBytes = fs.readFileSync(pdfPath)
    const doc = await PDFDocument.load(pdfBytes)
    const copiedPages = await mergedPdf.copyPages(doc, doc.getPageIndices())
    copiedPages.forEach((page) => mergedPdf.addPage(page))
  }

  const mergedBytes = await mergedPdf.save()
  const fileName = `merged_${Date.now()}.pdf`
  const destPath = path.join(docsDir, fileName)
  fs.writeFileSync(destPath, mergedBytes)

  return { success: true, filePath: destPath }
}

export async function splitPDF(pdfPath: string, ranges: string) {
  if (!fs.existsSync(pdfPath)) throw new Error('File not found')
  const docsDir = getDocumentsDir()
  const pdfBytes = fs.readFileSync(pdfPath)
  const sourceDoc = await PDFDocument.load(pdfBytes)
  const totalPages = sourceDoc.getPageCount()

  // Parse ranges like "1-3, 5"
  const pagesToExtract: number[] = []
  const parts = ranges.split(',')
  for (const part of parts) {
    const trimmed = part.trim()
    if (trimmed.includes('-')) {
      const [startStr, endStr] = trimmed.split('-')
      const start = parseInt(startStr, 10)
      const end = parseInt(endStr, 10)
      if (!isNaN(start) && !isNaN(end)) {
        for (let i = start; i <= end; i++) {
          if (i >= 1 && i <= totalPages) {
            pagesToExtract.push(i - 1)
          }
        }
      }
    } else {
      const p = parseInt(trimmed, 10)
      if (!isNaN(p) && p >= 1 && p <= totalPages) {
        pagesToExtract.push(p - 1)
      }
    }
  }

  if (pagesToExtract.length === 0) {
    throw new Error('No valid pages specified')
  }

  const newDoc = await PDFDocument.create()
  const copiedPages = await newDoc.copyPages(sourceDoc, pagesToExtract)
  copiedPages.forEach((page) => newDoc.addPage(page))

  const newBytes = await newDoc.save()
  const newName = `split_${path.basename(pdfPath, '.pdf')}_${Date.now()}.pdf`
  const destPath = path.join(docsDir, newName)
  fs.writeFileSync(destPath, newBytes)

  return { success: true, files: [destPath] }
}

export async function exportPDF(htmlContent: string, filename: string) {
  const docsDir = getDocumentsDir()
  const cleanName = filename.endsWith('.pdf') ? filename : `${filename}.pdf`
  const destPath = path.join(docsDir, cleanName)

  return new Promise<{ success: boolean; filePath: string }>((resolve, reject) => {
    const printWindow = new BrowserWindow({
      show: false,
      webPreferences: {
        nodeIntegration: false,
        contextIsolation: true
      }
    })

    // Add inline styling wrapper for PDF generation
    const fullHtml = `
      <html>
        <head>
          <meta charset="utf-8">
          <style>
            body { font-family: sans-serif; padding: 20px; line-height: 1.6; }
            h1 { color: #4f46e5; border-bottom: 2px solid #e5e7eb; padding-bottom: 10px; }
            table { width: 100%; border-collapse: collapse; margin: 20px 0; }
            th, td { border: 1px solid #e5e7eb; padding: 8px; text-align: right; }
            th { background-color: #f3f4f6; }
            blockquote { border-right: 4px solid #4f46e5; padding-right: 15px; margin: 20px 0; color: #4b5563; font-style: italic; }
          </style>
        </head>
        <body dir="rtl">
          ${htmlContent}
        </body>
      </html>
    `

    printWindow.loadURL(`data:text/html;charset=utf-8,${encodeURIComponent(fullHtml)}`)

    printWindow.webContents.once('did-finish-load', async () => {
      try {
        const data = await printWindow.webContents.printToPDF({
          printBackground: true,
          margins: { top: 0.5, bottom: 0.5, left: 0.5, right: 0.5 }
        })
        fs.writeFileSync(destPath, data)
        printWindow.destroy()
        resolve({ success: true, filePath: destPath })
      } catch (err) {
        printWindow.destroy()
        reject(err)
      }
    })
  })
}

export async function convertImage(imagePath: string, format: string, width?: number, quality?: number) {
  if (!fs.existsSync(imagePath)) throw new Error('Image not found')
  const docsDir = getDocumentsDir()
  const cleanFormat = format.toLowerCase().trim() as any

  let sharpInstance = sharp(imagePath)
  if (width && width > 0) {
    sharpInstance = sharpInstance.resize(width)
  }

  // Format configurations
  if (cleanFormat === 'jpg' || cleanFormat === 'jpeg') {
    sharpInstance = sharpInstance.jpeg({ quality: quality || 80 })
  } else if (cleanFormat === 'png') {
    sharpInstance = sharpInstance.png({ quality: quality || 80 })
  } else if (cleanFormat === 'webp') {
    sharpInstance = sharpInstance.webp({ quality: quality || 80 })
  }

  const outName = `converted_${path.basename(imagePath, path.extname(imagePath))}_${Date.now()}.${cleanFormat}`
  const outPath = path.join(docsDir, outName)
  await sharpInstance.toFile(outPath)

  return { success: true, filePath: outPath }
}

export async function parseBookmarks(filePath: string) {
  if (!fs.existsSync(filePath)) throw new Error('File not found')
  const htmlContent = fs.readFileSync(filePath, 'utf-8')
  const $ = cheerio.load(htmlContent)
  const links: any[] = []

  $('a').each((_, elem) => {
    const title = $(elem).text().trim()
    const url = $(elem).attr('href') || ''
    const tags = $(elem).attr('tags') || ''
    const category = 'book' // Default placeholder category

    if (url.startsWith('http://') || url.startsWith('https://')) {
      links.push({
        title: title || url,
        url,
        tags: tags ? tags.split(',') : [],
        category
      })
    }
  })
  return links
}
