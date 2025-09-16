// src/components/messages/contact-message.tsx

import React from 'react'
import { cn } from '@/lib/utils'
import { User, Phone, Mail, Building } from 'lucide-react'
import type { Platform } from '@/types/conversation.types'

interface ContactMessageProps {
  content: {
    contact?: {
      name: string
      phone?: string
      email?: string
      organization?: string
    }
    name?: string
    phone?: string
    email?: string
    text?: string
  }
  isOwn: boolean
  platform: Platform
  className?: string
}

export function ContactMessage({
  content,
  isOwn,
  platform,
  className
}: ContactMessageProps) {
  // Support both formats
  const contact = content.contact || {
    name: content.name || content.text || 'Unknown',
    phone: content.phone,
    email: content.email
  }
  
  if (!contact.name) {
    return (
      <div className={cn(
        "px-4 py-3 rounded-2xl bg-muted/50",
        className
      )}>
        <p className="text-sm text-muted-foreground">
          [Contact not available]
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
      <div className="p-4">
        {/* Contact header */}
        <div className="flex items-center gap-3 mb-3">
          <div className="w-12 h-12 bg-muted rounded-full flex items-center justify-center">
            <User className="w-6 h-6 text-muted-foreground" />
          </div>
          <div>
            <h4 className="font-medium">{contact.name}</h4>
            {contact.organization && (
              <p className="text-sm text-muted-foreground">{contact.organization}</p>
            )}
          </div>
        </div>
        
        {/* Contact details */}
        <div className="space-y-2">
          {contact.phone && (
            <a
              href={`tel:${contact.phone}`}
              className="flex items-center gap-3 text-sm hover:text-brand-600 transition-colors"
            >
              <Phone className="w-4 h-4 text-muted-foreground" />
              <span>{contact.phone}</span>
            </a>
          )}
          
          {contact.email && (
            <a
              href={`mailto:${contact.email}`}
              className="flex items-center gap-3 text-sm hover:text-brand-600 transition-colors"
            >
              <Mail className="w-4 h-4 text-muted-foreground" />
              <span>{contact.email}</span>
            </a>
          )}
          
          {contact.organization && (
            <div className="flex items-center gap-3 text-sm">
              <Building className="w-4 h-4 text-muted-foreground" />
              <span>{contact.organization}</span>
            </div>
          )}
        </div>
        
        {/* Platform indicator */}
        {platform === 'whatsapp' && (
          <div className="mt-3 pt-3 border-t">
            <span className="text-xs text-muted-foreground">
              WhatsApp Contact
            </span>
          </div>
        )}
      </div>
    </div>
  )
}