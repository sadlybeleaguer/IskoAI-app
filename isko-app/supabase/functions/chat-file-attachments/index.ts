import "jsr:@supabase/functions-js/edge-runtime.d.ts"
import { createClient, type SupabaseClient } from "npm:@supabase/supabase-js@2"
import JSZip from "npm:jszip@3.10.1"
import * as XLSX from "npm:xlsx@0.18.5"
import { getDocument } from "npm:pdfjs-dist@5.4.296/legacy/build/pdf.mjs"

import { corsHeaders } from "../_shared/cors.ts"

const CHAT_FILES_BUCKET = "chat-files"
const FILE_SELECT =
  "id, thread_id, user_id, original_name, mime_type, size_bytes, status, error_message, created_at, updated_at"
const MAX_FILE_SIZE_BYTES = 10 * 1024 * 1024
const MAX_EXTRACTED_TEXT_LENGTH = 40000
const MAX_ERROR_MESSAGE_LENGTH = 500
const SUPPORTED_EXTENSION_MIME_TYPES: Record<string, string> = {
  ".csv": "text/csv",
  ".docx":
    "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
  ".htm": "text/html",
  ".html": "text/html",
  ".json": "application/json",
  ".md": "text/markdown",
  ".pdf": "application/pdf",
  ".pptx":
    "application/vnd.openxmlformats-officedocument.presentationml.presentation",
  ".txt": "text/plain",
  ".xlsx": "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
}
const TEXT_FILE_EXTENSIONS = new Set([
  ".csv",
  ".htm",
  ".html",
  ".json",
  ".md",
  ".txt",
])

type SupportedExtension = keyof typeof SUPPORTED_EXTENSION_MIME_TYPES

type AttachmentRecord = {
  created_at: string
  error_message: string
  id: string
  mime_type: string
  original_name: string
  size_bytes: number
  status: "failed" | "processing" | "ready"
  thread_id: string
  updated_at: string
  user_id: string
}

class HttpError extends Error {
  status: number

  constructor(status: number, message: string) {
    super(message)
    this.status = status
  }
}

function jsonResponse(status: number, body: Record<string, unknown>) {
  return new Response(JSON.stringify(body), {
    status,
    headers: {
      ...corsHeaders,
      "Content-Type": "application/json",
    },
  })
}

function createServiceClient() {
  const supabaseUrl = Deno.env.get("SUPABASE_URL") ?? ""
  const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? ""

  if (!supabaseUrl || !serviceRoleKey) {
    throw new HttpError(500, "Supabase service role credentials are missing.")
  }

  return createClient(supabaseUrl, serviceRoleKey, {
    auth: {
      autoRefreshToken: false,
      detectSessionInUrl: false,
      persistSession: false,
    },
  })
}

function getAccessToken(authHeader: string) {
  const [scheme, token] = authHeader.trim().split(/\s+/, 2)

  if (scheme?.toLowerCase() !== "bearer" || !token) {
    throw new HttpError(401, "Authorization header must be a Bearer token.")
  }

  return token
}

async function requireAuthenticatedUser(
  serviceClient: SupabaseClient,
  authHeader: string,
) {
  const token = getAccessToken(authHeader)
  const {
    data: { user },
    error,
  } = await serviceClient.auth.getUser(token)

  if (error || !user?.id) {
    throw new HttpError(
      401,
      error?.message ?? "You must be signed in to manage chat files.",
    )
  }

  return user
}

function requireString(value: FormDataEntryValue | unknown, fieldName: string) {
  if (typeof value !== "string" || value.trim() === "") {
    throw new HttpError(400, `${fieldName} is required.`)
  }

  return value.trim()
}

function getFileExtension(fileName: string): SupportedExtension {
  const match = /\.([^.]+)$/.exec(fileName)
  const extension = match ? `.${match[1].toLowerCase()}` : ""

  if (!(extension in SUPPORTED_EXTENSION_MIME_TYPES)) {
    throw new HttpError(
      400,
      "Unsupported file type. Upload txt, md, csv, json, html, pdf, docx, xlsx, or pptx.",
    )
  }

  return extension as SupportedExtension
}

function sanitizeFileName(fileName: string) {
  const trimmed = fileName.trim()

  if (!trimmed) {
    throw new HttpError(400, "The uploaded file must have a name.")
  }

  const sanitized = trimmed.replace(/[^A-Za-z0-9._-]+/g, "-")

  return sanitized.replace(/^-+/, "").slice(0, 180) || "file"
}

function truncateMessage(message: string) {
  return message.slice(0, MAX_ERROR_MESSAGE_LENGTH)
}

function decodeHtmlEntities(value: string) {
  return value
    .replaceAll("&nbsp;", " ")
    .replaceAll("&amp;", "&")
    .replaceAll("&lt;", "<")
    .replaceAll("&gt;", ">")
    .replaceAll("&quot;", '"')
    .replaceAll("&#39;", "'")
    .replace(/&#(\d+);/g, (_, codePoint) => String.fromCodePoint(Number(codePoint)))
    .replace(/&#x([0-9a-f]+);/gi, (_, codePoint) =>
      String.fromCodePoint(Number.parseInt(codePoint, 16)),
    )
}

function normalizeExtractedText(value: string) {
  return decodeHtmlEntities(value)
    .replace(/\0/g, "")
    .replace(/\r\n?/g, "\n")
    .replace(/[ \t]+\n/g, "\n")
    .replace(/\n{3,}/g, "\n\n")
    .replace(/[ \t]{2,}/g, " ")
    .trim()
    .slice(0, MAX_EXTRACTED_TEXT_LENGTH)
}

function decodeTextBytes(bytes: Uint8Array) {
  if (bytes.length >= 2 && bytes[0] === 0xff && bytes[1] === 0xfe) {
    return new TextDecoder("utf-16le").decode(bytes)
  }

  if (bytes.length >= 2 && bytes[0] === 0xfe && bytes[1] === 0xff) {
    return new TextDecoder("utf-16be").decode(bytes)
  }

  return new TextDecoder().decode(bytes)
}

function extractTextFromXml(xml: string, options: { paragraphTag: string; textTag: string }) {
  return normalizeExtractedText(
    xml
      .replace(new RegExp(`<${options.textTag}:tab[^>]*\\/>`, "g"), "\t")
      .replace(new RegExp(`<${options.textTag}:br[^>]*\\/>`, "g"), "\n")
      .replace(new RegExp(`</${options.paragraphTag}:p>`, "g"), "\n")
      .replace(/<[^>]+>/g, " "),
  )
}

async function extractTextFile(bytes: Uint8Array, extension: SupportedExtension) {
  const decoded = decodeTextBytes(bytes)

  if (extension === ".html" || extension === ".htm") {
    return normalizeExtractedText(
      decoded
        .replace(/<br\s*\/?>/gi, "\n")
        .replace(/<\/(p|div|h1|h2|h3|h4|li|ol|ul|tr)>/gi, "\n")
        .replace(/<li>/gi, "- ")
        .replace(/<[^>]+>/g, " "),
    )
  }

  return normalizeExtractedText(decoded)
}

async function extractDocxText(bytes: Uint8Array) {
  const zip = await JSZip.loadAsync(bytes)
  const documentFile = zip.file("word/document.xml")

  if (!documentFile) {
    throw new Error("The DOCX file is missing word/document.xml.")
  }

  return extractTextFromXml(await documentFile.async("string"), {
    paragraphTag: "w",
    textTag: "w",
  })
}

function sortZipEntriesByTrailingNumber(left: string, right: string) {
  const leftValue = Number(/\d+/.exec(left)?.[0] ?? "0")
  const rightValue = Number(/\d+/.exec(right)?.[0] ?? "0")

  return leftValue - rightValue
}

async function extractPptxText(bytes: Uint8Array) {
  const zip = await JSZip.loadAsync(bytes)
  const slideEntries = Object.keys(zip.files)
    .filter((fileName) => /^ppt\/slides\/slide\d+\.xml$/.test(fileName))
    .sort(sortZipEntriesByTrailingNumber)

  if (!slideEntries.length) {
    throw new Error("The PPTX file did not include any readable slides.")
  }

  const slides: string[] = []

  for (const [index, entryName] of slideEntries.entries()) {
    const slideXml = await zip.file(entryName)?.async("string")

    if (!slideXml) {
      continue
    }

    const content = extractTextFromXml(slideXml, {
      paragraphTag: "a",
      textTag: "a",
    })

    if (content) {
      slides.push(`Slide ${index + 1}\n${content}`)
    }
  }

  return normalizeExtractedText(slides.join("\n\n"))
}

async function extractXlsxText(bytes: Uint8Array) {
  const workbook = XLSX.read(bytes, { type: "array" })
  const sheets = workbook.SheetNames.map((sheetName) => {
    const sheet = workbook.Sheets[sheetName]
    const csv = XLSX.utils.sheet_to_csv(sheet, { blankrows: false }).trim()

    return csv ? `Sheet: ${sheetName}\n${csv}` : `Sheet: ${sheetName}`
  })

  return normalizeExtractedText(sheets.join("\n\n"))
}

async function extractPdfText(bytes: Uint8Array) {
  const loadingTask = getDocument({
    data: bytes,
    disableWorker: true,
    isEvalSupported: false,
    useSystemFonts: false,
    verbosity: 0,
  })
  const pdf = await loadingTask.promise

  try {
    const pages: string[] = []

    for (let pageNumber = 1; pageNumber <= pdf.numPages; pageNumber += 1) {
      const page = await pdf.getPage(pageNumber)
      const content = await page.getTextContent()
      const text = content.items
        .map((item) =>
          item && typeof item === "object" && "str" in item && typeof item.str === "string"
            ? item.str
            : "",
        )
        .join(" ")
        .trim()

      if (text) {
        pages.push(`Page ${pageNumber}\n${text}`)
      }
    }

    return normalizeExtractedText(pages.join("\n\n"))
  } finally {
    await loadingTask.destroy()
  }
}

async function extractFileText(bytes: Uint8Array, extension: SupportedExtension) {
  switch (extension) {
    case ".docx":
      return extractDocxText(bytes)
    case ".pdf":
      return extractPdfText(bytes)
    case ".pptx":
      return extractPptxText(bytes)
    case ".xlsx":
      return extractXlsxText(bytes)
    default:
      if (TEXT_FILE_EXTENSIONS.has(extension)) {
        return extractTextFile(bytes, extension)
      }

      throw new Error("Unsupported file type.")
  }
}

async function requireOwnedThread(
  serviceClient: SupabaseClient,
  threadId: string,
  userId: string,
) {
  const { data, error } = await serviceClient
    .from("chat_threads")
    .select("id, user_id")
    .eq("id", threadId)
    .eq("user_id", userId)
    .maybeSingle<{ id: string; user_id: string }>()

  if (error) {
    throw new HttpError(500, error.message)
  }

  if (!data) {
    throw new HttpError(404, "Chat thread was not found.")
  }
}

async function persistAttachmentRecord(
  serviceClient: SupabaseClient,
  values: Record<string, unknown>,
) {
  const { data, error } = await serviceClient
    .from("chat_thread_files")
    .insert(values)
    .select(FILE_SELECT)
    .single<AttachmentRecord>()

  if (error) {
    throw new HttpError(500, error.message)
  }

  return data
}

async function handleUpload(
  request: Request,
  serviceClient: SupabaseClient,
  userId: string,
) {
  const formData = await request.formData()
  const action = formData.get("action")

  if (action != null && action !== "upload") {
    throw new HttpError(400, "Unsupported chat file action.")
  }

  const threadId = requireString(formData.get("threadId"), "threadId")
  const fileEntry = formData.get("file")

  if (!(fileEntry instanceof File)) {
    throw new HttpError(400, "file is required.")
  }

  await requireOwnedThread(serviceClient, threadId, userId)

  if (!fileEntry.size) {
    throw new HttpError(400, "The uploaded file is empty.")
  }

  if (fileEntry.size > MAX_FILE_SIZE_BYTES) {
    throw new HttpError(400, "Files must be 10 MB or smaller.")
  }

  const originalName = fileEntry.name.trim()
  const extension = getFileExtension(originalName)
  const mimeType = SUPPORTED_EXTENSION_MIME_TYPES[extension]
  const sanitizedFileName = sanitizeFileName(originalName)
  const storagePath = `${userId}/${threadId}/${crypto.randomUUID()}-${sanitizedFileName}`
  const fileBytes = new Uint8Array(await fileEntry.arrayBuffer())

  const { error: uploadError } = await serviceClient.storage
    .from(CHAT_FILES_BUCKET)
    .upload(storagePath, fileBytes, {
      contentType: mimeType,
      upsert: false,
    })

  if (uploadError) {
    throw new HttpError(500, uploadError.message)
  }

  let extractedText = ""
  let status: AttachmentRecord["status"] = "ready"
  let errorMessage = ""

  try {
    extractedText = await extractFileText(fileBytes, extension)

    if (!extractedText) {
      throw new Error("No readable text could be extracted from this file.")
    }
  } catch (error) {
    status = "failed"
    errorMessage = truncateMessage(
      error instanceof Error
        ? error.message
        : "Unable to extract readable text from this file.",
    )
  }

  try {
    const file = await persistAttachmentRecord(serviceClient, {
      error_message: errorMessage,
      extracted_text: status === "ready" ? extractedText : "",
      mime_type: mimeType,
      original_name: originalName,
      size_bytes: fileBytes.byteLength,
      status,
      storage_bucket: CHAT_FILES_BUCKET,
      storage_path: storagePath,
      thread_id: threadId,
      user_id: userId,
    })

    return jsonResponse(200, { file })
  } catch (error) {
    await serviceClient.storage.from(CHAT_FILES_BUCKET).remove([storagePath]).catch(() => undefined)
    throw error
  }
}

async function handleDelete(
  payload: Record<string, unknown>,
  serviceClient: SupabaseClient,
  userId: string,
) {
  const fileId = requireString(payload.fileId, "fileId")
  const { data, error } = await serviceClient
    .from("chat_thread_files")
    .select("id, storage_bucket, storage_path")
    .eq("id", fileId)
    .eq("user_id", userId)
    .maybeSingle<{ id: string; storage_bucket: string; storage_path: string }>()

  if (error) {
    throw new HttpError(500, error.message)
  }

  if (!data) {
    throw new HttpError(404, "Attached file was not found.")
  }

  const { error: removeStorageError } = await serviceClient.storage
    .from(data.storage_bucket)
    .remove([data.storage_path])

  if (removeStorageError) {
    throw new HttpError(500, removeStorageError.message)
  }

  const { error: deleteError } = await serviceClient
    .from("chat_thread_files")
    .delete()
    .eq("id", fileId)
    .eq("user_id", userId)

  if (deleteError) {
    throw new HttpError(500, deleteError.message)
  }

  return jsonResponse(200, { fileId })
}

Deno.serve(async (request: Request) => {
  if (request.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders })
  }

  if (request.method !== "POST") {
    return jsonResponse(405, { error: "Method not allowed." })
  }

  try {
    const authHeader = request.headers.get("Authorization")

    if (!authHeader) {
      throw new HttpError(401, "Authorization header is required.")
    }

    const serviceClient = createServiceClient()
    const user = await requireAuthenticatedUser(serviceClient, authHeader)
    const contentType = request.headers.get("Content-Type") ?? ""

    if (contentType.includes("multipart/form-data")) {
      return await handleUpload(request, serviceClient, user.id)
    }

    const payload = (await request.json().catch(() => null)) as Record<string, unknown> | null

    if (!payload || typeof payload !== "object") {
      throw new HttpError(400, "Request body must be valid JSON or multipart form data.")
    }

    const action = requireString(payload.action, "action")

    if (action === "delete") {
      return await handleDelete(payload, serviceClient, user.id)
    }

    throw new HttpError(400, "Unsupported chat file action.")
  } catch (error) {
    if (error instanceof HttpError) {
      return jsonResponse(error.status, { error: error.message })
    }

    const message = error instanceof Error ? error.message : "Unexpected server error."
    return jsonResponse(500, { error: message })
  }
})
