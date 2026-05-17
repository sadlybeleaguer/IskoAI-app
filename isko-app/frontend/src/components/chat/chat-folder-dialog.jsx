import { useEffect, useMemo, useRef, useState } from "react"
import {
  FileText,
  Paperclip,
  Plus,
  Upload,
  Wrench,
} from "lucide-react"

import { ChatFileAttachments } from "@/components/chat/chat-file-attachments"
import { ChatNotePicker } from "@/components/chat/chat-note-picker"
import { chatToolOptions } from "@/components/chat/chat-tool-options"
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"
import { Button } from "@/components/ui/button"
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuRadioGroup,
  DropdownMenuRadioItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Input } from "@/components/ui/input"
import { acceptedChatFileInputAccept } from "@/services/db.service"
import { getErrorMessage } from "@/utils/errors"
import { getNoteTitle } from "@/utils/notes"

function createQueuedFileRecord(file) {
  return {
    created_at: new Date().toISOString(),
    error_message: "Will upload when the folder is created.",
    id: `queued-${crypto.randomUUID()}`,
    mime_type: file.type || "",
    original_name: file.name,
    size_bytes: file.size,
    status: "queued",
    updated_at: new Date().toISOString(),
  }
}

export function ChatFolderDialog({
  availableNotes = [],
  createFolder,
  folder = null,
  getFolderFiles,
  isLoadingFolderFiles = false,
  isLoadingNotes = false,
  isUploadingFiles = false,
  loadAvailableNotes,
  loadFolderFiles,
  onOpenChange,
  open,
  removeFolderFile,
  removingFileId = "",
  updateFolder,
  uploadFolderFiles,
  validateFiles,
}) {
  const fileInputRef = useRef(null)
  const [persistedFolder, setPersistedFolder] = useState(null)
  const [title, setTitle] = useState("")
  const [systemPrompt, setSystemPrompt] = useState("")
  const [selectedTool, setSelectedTool] = useState("")
  const [selectedNote, setSelectedNote] = useState(null)
  const [isSaving, setIsSaving] = useState(false)
  const [dialogError, setDialogError] = useState("")
  const [isNotePickerOpen, setIsNotePickerOpen] = useState(false)
  const [queuedFiles, setQueuedFiles] = useState([])
  const effectiveFolder = folder ?? persistedFolder

  const folderFiles = useMemo(
    () => (effectiveFolder?.id ? getFolderFiles(effectiveFolder.id) : []),
    [effectiveFolder?.id, getFolderFiles],
  )
  const selectedToolOption = useMemo(
    () => chatToolOptions.find((tool) => tool.value === selectedTool) ?? null,
    [selectedTool],
  )
  const isEditing = Boolean(effectiveFolder?.id)

  useEffect(() => {
    if (!open) {
      return
    }

    setPersistedFolder(folder ?? null)
    setTitle(folder?.title ?? "")
    setSystemPrompt(folder?.system_prompt ?? "")
    setSelectedTool(folder?.selected_tool ?? "")
    setSelectedNote(
      folder?.attached_note_id
        ? {
            id: folder.attached_note_id,
            title: folder.attached_note_title || "Untitled note",
          }
        : null,
    )
    setQueuedFiles([])
    setDialogError("")
    setIsNotePickerOpen(false)
  }, [folder, open])

  useEffect(() => {
    if (!open || !effectiveFolder?.id) {
      return
    }

    void loadFolderFiles(effectiveFolder.id)
  }, [effectiveFolder?.id, loadFolderFiles, open])

  const handlePickFiles = async (fileList) => {
    const nextFiles = Array.from(fileList ?? [])

    if (!nextFiles.length) {
      return
    }

    try {
      const validatedFiles = validateFiles(nextFiles)
      setDialogError("")

      if (!effectiveFolder?.id) {
        setQueuedFiles((currentFiles) => [
          ...currentFiles,
          ...validatedFiles.map((file) => ({
            file,
            record: createQueuedFileRecord(file),
          })),
        ])
        return
      }

      await uploadFolderFiles({
        files: validatedFiles,
        folderId: effectiveFolder.id,
      })
    } catch (error) {
      setDialogError(getErrorMessage(error))
    }
  }

  const handleSubmit = async (event) => {
    event.preventDefault()

    const trimmedTitle = title.trim()

    if (!trimmedTitle) {
      setDialogError("Folder title is required.")
      return
    }

    setIsSaving(true)
    setDialogError("")

    try {
      const folderPayload = {
        attachedNoteId: selectedNote?.id ?? null,
        selectedTool,
        systemPrompt,
        title: trimmedTitle,
      }

      const savedFolder = isEditing
        ? await updateFolder({
            folderId: effectiveFolder.id,
            ...folderPayload,
          })
        : await createFolder(folderPayload)

      if (!isEditing && queuedFiles.length) {
        setPersistedFolder(savedFolder)
        setQueuedFiles([])
        const uploadResult = await uploadFolderFiles({
          files: queuedFiles.map((queuedFile) => queuedFile.file),
          folderId: savedFolder.id,
        })

        if (uploadResult?.failedCount) {
          setDialogError(
            `${uploadResult.failedCount} folder file${
              uploadResult.failedCount === 1 ? "" : "s"
            } failed to process. Reopen folder settings to review them.`,
          )
          return
        }
      }

      onOpenChange(false)
    } catch (error) {
      setDialogError(getErrorMessage(error))
    } finally {
      setIsSaving(false)
    }
  }

  const displayedFiles = isEditing
    ? folderFiles
    : queuedFiles.map((queuedFile) => queuedFile.record)

  const handleOpenNotePicker = () => {
    setIsNotePickerOpen(true)
    setDialogError("")
    void loadAvailableNotes()
  }

  return (
    <>
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="settings-dialog-grain overflow-hidden p-0 sm:max-w-2xl">
          <form onSubmit={handleSubmit}>
            <div className="border-b border-border/70 bg-card px-5 py-4">
              <DialogHeader className="max-w-xl pr-8">
                <DialogTitle>
                  {isEditing ? "Folder settings" : "New folder"}
                </DialogTitle>
              </DialogHeader>
            </div>

            <div className="flex max-h-[min(42rem,calc(100vh-8rem))] flex-col gap-4 overflow-y-auto px-5 pb-5 pt-5">
              {dialogError ? (
                <Alert variant="destructive">
                  <AlertTitle>Folder update failed</AlertTitle>
                  <AlertDescription>{dialogError}</AlertDescription>
                </Alert>
              ) : null}

              <div className="grid gap-4">
                <div className="grid gap-2">
                  <Label htmlFor="chat-folder-title">Title</Label>
                  <Input
                    id="chat-folder-title"
                    value={title}
                    onChange={(event) => setTitle(event.target.value)}
                    placeholder="e.g. Physics revision pack"
                    maxLength={120}
                  />
                </div>

                <div className="grid gap-2">
                  <Label htmlFor="chat-folder-system-prompt">Instructions</Label>
                  <div className="overflow-hidden rounded-lg border bg-background shadow-[0_1px_2px_rgba(15,23,42,0.08)]">
                    <Textarea
                      id="chat-folder-system-prompt"
                      value={systemPrompt}
                      onChange={(event) => setSystemPrompt(event.target.value)}
                      placeholder="Add reusable instructions or a pre-prompt for every chat in this folder."
                      className="min-h-32 resize-none border-0 px-4 py-4 shadow-none focus-visible:ring-0"
                    />
                    <div className="flex flex-wrap items-center justify-between gap-3 border-t px-4 py-3 text-sm">
                      <div className="flex items-center gap-1 text-muted-foreground">
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button
                              type="button"
                              variant="ghost"
                              size="icon-sm"
                              aria-label="Attach content"
                            >
                              <Plus data-icon="inline-start" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="start" className="z-[60] w-48">
                            <DropdownMenuLabel>Attach</DropdownMenuLabel>
                            <DropdownMenuSeparator />
                            <DropdownMenuGroup>
                              <DropdownMenuItem
                                onSelect={() => fileInputRef.current?.click()}
                                disabled={isUploadingFiles}
                              >
                                {isEditing ? (
                                  <Paperclip data-icon="inline-start" />
                                ) : (
                                  <Upload data-icon="inline-start" />
                                )}
                                {isUploadingFiles
                                  ? "Uploading files..."
                                  : isEditing
                                    ? "Upload files"
                                    : "Queue files"}
                              </DropdownMenuItem>
                              <DropdownMenuItem onSelect={handleOpenNotePicker}>
                                <FileText data-icon="inline-start" />
                                {selectedNote ? "Replace attached note" : "Attach notes"}
                              </DropdownMenuItem>
                            </DropdownMenuGroup>
                          </DropdownMenuContent>
                        </DropdownMenu>

                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button
                              type="button"
                              variant="ghost"
                              size="icon-sm"
                              aria-label="Select folder tool"
                            >
                              <Wrench data-icon="inline-start" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="start" className="z-[60] w-56">
                            <DropdownMenuLabel>Tools</DropdownMenuLabel>
                            <DropdownMenuSeparator />
                            <DropdownMenuRadioGroup
                              value={selectedTool}
                              onValueChange={setSelectedTool}
                            >
                              <DropdownMenuRadioItem value="">
                                Default
                              </DropdownMenuRadioItem>
                              {chatToolOptions.map((tool) => {
                                const Icon = tool.icon

                                return (
                                  <DropdownMenuRadioItem
                                    key={tool.value}
                                    value={tool.value}
                                  >
                                    <Icon data-icon="inline-start" />
                                    {tool.value}
                                  </DropdownMenuRadioItem>
                                )
                              })}
                            </DropdownMenuRadioGroup>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </div>

                      <div className="flex flex-wrap items-center justify-end gap-2 text-xs text-muted-foreground">
                        <span>
                          Tool {selectedToolOption?.value || "Default"}
                        </span>
                        {displayedFiles.length ? (
                          <span>
                            Files {displayedFiles.length}
                          </span>
                        ) : null}
                        {selectedNote ? (
                          <span className="max-w-[16rem] truncate">
                            Note {selectedNote.title}
                          </span>
                        ) : null}
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              <div className="grid gap-3">
                <input
                  ref={fileInputRef}
                  type="file"
                  multiple
                  className="hidden"
                  accept={acceptedChatFileInputAccept}
                  onChange={(event) => {
                    void handlePickFiles(event.target.files)
                    event.target.value = ""
                  }}
                />

                {selectedNote ? (
                  <div className="flex items-center justify-between gap-3 rounded-lg border border-border/70 bg-muted/20 px-4 py-3">
                    <div className="min-w-0">
                      <div className="truncate text-sm font-medium">
                        {selectedNote.title}
                      </div>
                      <div className="text-xs text-muted-foreground">
                        This note becomes reusable context for every chat in the folder.
                      </div>
                    </div>
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      onClick={() => setSelectedNote(null)}
                    >
                      Remove
                    </Button>
                  </div>
                ) : (
                  <div className="rounded-lg border border-dashed border-border/70 bg-muted/10 px-4 py-3 text-sm text-muted-foreground">
                  </div>
                )}

                {displayedFiles.length ? (
                  <ChatFileAttachments
                    description="These files are applied to every chat assigned to this folder."
                    files={displayedFiles}
                    onRemove={
                      isEditing
                        ? (file) => removeFolderFile(effectiveFolder.id, file)
                        : (file) =>
                            setQueuedFiles((currentFiles) =>
                              currentFiles.filter(
                                (currentFile) => currentFile.record.id !== file.id,
                              ),
                            )
                    }
                    removingFileId={removingFileId}
                    scope="folder"
                    title={isEditing ? "Folder files" : "Queued files"}
                  />
                ) : isEditing && isLoadingFolderFiles ? (
                  <div className="rounded-lg border border-border/70 bg-muted/20 px-4 py-3 text-sm text-muted-foreground">
                    Loading folder files...
                  </div>
                ) : isEditing ? (
                  <div className="rounded-lg border border-dashed border-border/70 bg-muted/10 px-4 py-3 text-sm text-muted-foreground">
                    No reusable folder files yet.
                  </div>
                ) : null}
              </div>
            </div>

            <DialogFooter className="border-t border-border/70 bg-background px-5 py-4">
              <Button
                type="button"
                variant="ghost"
                onClick={() => onOpenChange(false)}
                disabled={isSaving}
              >
                Cancel
              </Button>
              <Button type="submit" disabled={isSaving}>
                {isSaving
                  ? isEditing
                    ? "Saving..."
                    : "Creating..."
                  : isEditing
                    ? "Save changes"
                    : "Create folder"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      <ChatNotePicker
        description="One note stays attached to this folder until you remove it."
        heading="Attach folder note"
        isLoading={isLoadingNotes}
        notes={availableNotes}
        onClose={() => setIsNotePickerOpen(false)}
        onSelectNote={(note) => {
          setSelectedNote(
            note
              ? {
                  id: note.id,
                  title: getNoteTitle(note),
                }
              : null,
          )
          setIsNotePickerOpen(false)
        }}
        open={isNotePickerOpen}
        selectedNoteId={selectedNote?.id ?? ""}
      />
    </>
  )
}
