// src/components/messages/file-message.tsx

import React from 'react'
import { cn } from '@/lib/utils'
import { FileText, Download, File, FileSpreadsheet, FileImage, Archive } from 'lucide-react'

interface FileMessageProps {
  content: {
    media_url?: string
    file_url?: string
    file_name?: string
    file_size?: number
    file_type?: string
    text?: string
  }
  isOwn: boolean
  className?: string
}

export function FileMessage({
  content,
  isOwn,
  className
}: FileMessageProps) {
  const fileUrl = content.media_url || content.file_url
  const fileName = content.file_name || content.text || 'Unknown file'
  const fileSize = content.file_size
  const fileType = content.file_type || getFileType(fileName)
  
  const Icon = getFileIcon(fileType)
  
  if (!fileUrl) {
    return (
      <div className={cn(
        "px-4 py-3 rounded-2xl bg-muted/50",
        className
      )}>
        <p className="text-sm text-muted-foreground">
          [File not available]
        </p>
      </div>
    )
  }
  
  return (
    <div className={cn(
      "rounded-2xl overflow-hidden",
      isOwn ? "bg-brand-500/10" : "bg-muted/50",
      className
    )}>
      <a
        href={fileUrl}
        download={fileName}
        className="flex items-center gap-3 p-3 hover:bg-black/5 dark:hover:bg-white/5 transition-colors"
      >
        {/* File icon */}
        <div className={cn(
          "w-12 h-12 rounded-lg flex items-center justify-center",
          isOwn ? "bg-brand-500/20" : "bg-muted"
        )}>
          <Icon className="w-6 h-6 text-muted-foreground" />
        </div>
        
        {/* File info */}
        <div className="flex-1 min-w-0">
          <p className="text-sm font-medium truncate">
            {fileName}
          </p>
          {fileSize && (
            <p className="text-xs text-muted-foreground">
              {formatFileSize(fileSize)} • {fileType.toUpperCase()}
            </p>
          )}
        </div>
        
        {/* Download button */}
        <button className="p-2 hover:bg-muted rounded-lg transition-colors">
          <Download className="w-4 h-4" />
        </button>
      </a>
    </div>
  )
}

function getFileType(fileName: string): string {
  const extension = fileName.split('.').pop()?.toLowerCase()
  return extension || 'file'
}

function getFileIcon(fileType: string) {
  switch (fileType.toLowerCase()) {
    case 'pdf':
    case 'doc':
    case 'docx':
    case 'txt':
      return FileText
    case 'xls':
    case 'xlsx':
    case 'csv':
      return FileSpreadsheet
    case 'jpg':
    case 'jpeg':
    case 'png':
    case 'gif':
      return FileImage
    case 'zip':
    case 'rar':
    case '7z':
      return Archive
    default:
      return File
  }
}

function formatFileSize(bytes: number): string {
  if (bytes < 1024) return bytes + ' B'
  if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + ' KB'
  return (bytes / (1024 * 1024)).toFixed(1) + ' MB'
}