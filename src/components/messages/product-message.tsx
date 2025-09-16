// src/components/messages/product-message.tsx

import React from 'react'
import { cn } from '@/lib/utils'
import { ShoppingBag, ExternalLink } from 'lucide-react'
import type { Platform } from '@/types/conversation.types'

interface ProductMessageProps {
  content: {
    product?: {
      id: string
      name: string
      price: number
      currency: string
      image_url?: string
      url?: string
      description?: string
    }
    product_id?: string
    text?: string
  }
  platform: Platform
  className?: string
  onClick?: () => void
}

export function ProductMessage({
  content,
  platform,
  className,
  onClick
}: ProductMessageProps) {
  const product = content.product
  
  if (!product && !content.product_id) {
    return (
      <div className={cn(
        "px-4 py-3 rounded-2xl bg-muted/50",
        className
      )}>
        <p className="text-sm text-muted-foreground">
          [Product not available]
        </p>
      </div>
    )
  }
  
  // If only product_id is available
  if (!product) {
    return (
      <div className={cn(
        "px-4 py-3 rounded-2xl bg-muted/50",
        className
      )}>
        <div className="flex items-center gap-2">
          <ShoppingBag className="w-4 h-4 text-muted-foreground" />
          <span className="text-sm">Product #{content.product_id}</span>
        </div>
      </div>
    )
  }
  
  const formatPrice = (price: number, currency: string) => {
    if (currency === 'THB' || currency === '฿') {
      return `฿${price.toLocaleString('th-TH')}`
    }
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: currency || 'USD'
    }).format(price)
  }
  
  return (
    <div className={cn(
      "rounded-2xl overflow-hidden bg-white dark:bg-gray-800 border",
      className
    )}>
      {/* Product image */}
      {product.image_url && (
        <div 
          className="relative h-48 bg-muted cursor-pointer"
          onClick={onClick}
        >
          <img
            src={product.image_url}
            alt={product.name}
            className="w-full h-full object-cover"
          />
          {/* Platform badge */}
          <div className={cn(
            "absolute top-2 right-2 px-2 py-1 rounded text-xs text-white",
            platform === 'shopee' ? "bg-orange-500" :
            platform === 'lazada' ? "bg-blue-600" :
            platform === 'tiktok' ? "bg-black" :
            "bg-brand-500"
          )}>
            {platform.charAt(0).toUpperCase() + platform.slice(1)}
          </div>
        </div>
      )}
      
      {/* Product details */}
      <div className="p-4">
        <h4 className="font-medium mb-1">{product.name}</h4>
        
        {product.description && (
          <p className="text-sm text-muted-foreground mb-3 line-clamp-2">
            {product.description}
          </p>
        )}
        
        {/* Price */}
        <div className="flex items-center justify-between mb-3">
          <span className="text-lg font-bold text-brand-600 dark:text-brand-400">
            {formatPrice(product.price, product.currency)}
          </span>
          {product.id && (
            <span className="text-xs text-muted-foreground">
              ID: {product.id}
            </span>
          )}
        </div>
        
        {/* View product button */}
        {product.url && (
          <a
            href={product.url}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-2 w-full justify-center px-4 py-2 bg-brand-500 text-white rounded-lg hover:bg-brand-600 transition-colors"
          >
            <ShoppingBag className="w-4 h-4" />
            View Product
            <ExternalLink className="w-3 h-3" />
          </a>
        )}
      </div>
    </div>
  )
}