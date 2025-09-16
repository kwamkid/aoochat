// src/components/messages/location-message.tsx

import React from 'react'
import { cn } from '@/lib/utils'
import { MapPin, Navigation, ExternalLink } from 'lucide-react'

interface LocationMessageProps {
  content: {
    location?: {
      latitude: number
      longitude: number
      address?: string
      name?: string
    }
    latitude?: number
    longitude?: number
    address?: string
    text?: string
  }
  isOwn: boolean
  className?: string
  onClick?: () => void
}

export function LocationMessage({
  content,
  isOwn,
  className,
  onClick
}: LocationMessageProps) {
  // Support both formats
  const latitude = content.location?.latitude || content.latitude
  const longitude = content.location?.longitude || content.longitude
  const address = content.location?.address || content.address || content.text
  const name = content.location?.name
  
  if (!latitude || !longitude) {
    return (
      <div className={cn(
        "px-4 py-3 rounded-2xl bg-muted/50",
        className
      )}>
        <p className="text-sm text-muted-foreground">
          [Location not available]
        </p>
      </div>
    )
  }
  
  // Generate Google Maps URL
  const mapsUrl = `https://www.google.com/maps?q=${latitude},${longitude}`
  
  // Generate static map image URL
  const staticMapUrl = `https://maps.googleapis.com/maps/api/staticmap?center=${latitude},${longitude}&zoom=15&size=300x150&markers=color:red%7C${latitude},${longitude}&key=${process.env.NEXT_PUBLIC_GOOGLE_MAPS_KEY || ''}`
  
  return (
    <div className={cn(
      "rounded-2xl overflow-hidden",
      isOwn ? "bg-brand-500/10" : "bg-muted/50",
      className
    )}>
      {/* Map preview (if Google Maps API key is available) */}
      {process.env.NEXT_PUBLIC_GOOGLE_MAPS_KEY && (
        <div 
          className="relative h-40 bg-muted cursor-pointer group"
          onClick={onClick}
        >
          <img
            src={staticMapUrl}
            alt="Location map"
            className="w-full h-full object-cover"
          />
          <div className="absolute inset-0 bg-black/0 group-hover:bg-black/20 transition-colors" />
          <div className="absolute inset-0 flex items-center justify-center">
            <div className="w-8 h-8 bg-red-500 rounded-full shadow-lg flex items-center justify-center">
              <MapPin className="w-5 h-5 text-white" />
            </div>
          </div>
        </div>
      )}
      
      {/* Location details */}
      <div className="p-3">
        {name && (
          <h4 className="font-medium mb-1">{name}</h4>
        )}
        
        {address && (
          <p className="text-sm text-muted-foreground mb-2">{address}</p>
        )}
        
        <div className="flex items-center gap-2 text-xs text-muted-foreground">
          <Navigation className="w-3 h-3" />
          <span>{latitude.toFixed(6)}, {longitude.toFixed(6)}</span>
        </div>
        
        {/* Open in maps button */}
        <a
          href={mapsUrl}
          target="_blank"
          rel="noopener noreferrer"
          className={cn(
            "inline-flex items-center gap-2 mt-3 px-3 py-1.5 rounded-lg text-sm transition-colors",
            isOwn 
              ? "bg-brand-500 text-white hover:bg-brand-600" 
              : "bg-muted hover:bg-muted/80"
          )}
        >
          <MapPin className="w-4 h-4" />
          Open in Maps
          <ExternalLink className="w-3 h-3" />
        </a>
      </div>
    </div>
  )
}