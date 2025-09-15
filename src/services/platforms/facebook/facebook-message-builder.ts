// src/services/platforms/facebook/facebook-message-builder.ts

interface QuickReply {
  content_type: 'text' | 'user_phone_number' | 'user_email'
  title?: string
  payload?: string
  image_url?: string
}

interface Button {
  type: 'web_url' | 'postback' | 'phone_number' | 'share'
  title: string
  url?: string
  payload?: string
}

interface CarouselElement {
  title: string
  subtitle?: string
  image_url?: string
  default_action?: {
    type: 'web_url'
    url: string
  }
  buttons?: Button[]
}

class FacebookMessageBuilder {
  /**
   * Build text message
   */
  text(text: string): any {
    return {
      text
    }
  }

  /**
   * Build image message
   */
  image(url: string, caption?: string): any | any[] {
    if (caption) {
      // Send caption as separate text message first
      return [
        { text: caption },
        {
          attachment: {
            type: 'image',
            payload: {
              url,
              is_reusable: true
            }
          }
        }
      ]
    }
    
    return {
      attachment: {
        type: 'image',
        payload: {
          url,
          is_reusable: true
        }
      }
    }
  }

  /**
   * Build video message
   */
  video(url: string, caption?: string): any | any[] {
    if (caption) {
      return [
        { text: caption },
        {
          attachment: {
            type: 'video',
            payload: {
              url,
              is_reusable: true
            }
          }
        }
      ]
    }
    
    return {
      attachment: {
        type: 'video',
        payload: {
          url,
          is_reusable: true
        }
      }
    }
  }

  /**
   * Build audio message
   */
  audio(url: string): any {
    return {
      attachment: {
        type: 'audio',
        payload: {
          url,
          is_reusable: true
        }
      }
    }
  }

  /**
   * Build file message
   */
  file(url: string, filename?: string): any {
    return {
      attachment: {
        type: 'file',
        payload: {
          url,
          is_reusable: true
        }
      }
    }
  }

  /**
   * Build location message
   */
  location(lat: number, lng: number, title?: string): any {
    return {
      attachment: {
        type: 'location',
        payload: {
          coordinates: {
            lat,
            long: lng
          }
        }
      }
    }
  }

  /**
   * Build quick replies message
   */
  quickReplies(text: string, options: Array<{ title: string; payload: string; image_url?: string }>): any {
    const quickReplies: QuickReply[] = options.map(option => ({
      content_type: 'text',
      title: option.title,
      payload: option.payload,
      image_url: option.image_url
    }))

    return {
      text,
      quick_replies: quickReplies
    }
  }

  /**
   * Build button template message
   */
  buttons(text: string, buttons: Array<{ type: 'url' | 'postback' | 'phone'; title: string; payload: string }>): any {
    const formattedButtons: Button[] = buttons.map(btn => {
      if (btn.type === 'url') {
        return {
          type: 'web_url',
          title: btn.title,
          url: btn.payload
        }
      } else if (btn.type === 'phone') {
        return {
          type: 'phone_number',
          title: btn.title,
          payload: btn.payload
        }
      } else {
        return {
          type: 'postback',
          title: btn.title,
          payload: btn.payload
        }
      }
    })

    return {
      attachment: {
        type: 'template',
        payload: {
          template_type: 'button',
          text,
          buttons: formattedButtons
        }
      }
    }
  }

  /**
   * Build generic template (carousel) message
   */
  carousel(items: Array<{
    title: string
    subtitle?: string
    image_url?: string
    buttons?: Array<{ type: 'url' | 'postback'; title: string; payload: string }>
  }>): any {
    const elements: CarouselElement[] = items.map(item => {
      const element: CarouselElement = {
        title: item.title
      }

      if (item.subtitle) {
        element.subtitle = item.subtitle
      }

      if (item.image_url) {
        element.image_url = item.image_url
      }

      if (item.buttons) {
        element.buttons = item.buttons.map(btn => {
          if (btn.type === 'url') {
            return {
              type: 'web_url',
              title: btn.title,
              url: btn.payload
            }
          } else {
            return {
              type: 'postback',
              title: btn.title,
              payload: btn.payload
            }
          }
        })
      }

      return element
    })

    return {
      attachment: {
        type: 'template',
        payload: {
          template_type: 'generic',
          elements
        }
      }
    }
  }

  /**
   * Build media template message
   */
  mediaTemplate(mediaType: 'image' | 'video', url: string, buttons?: Button[]): any {
    return {
      attachment: {
        type: 'template',
        payload: {
          template_type: 'media',
          elements: [{
            media_type: mediaType,
            url,
            buttons: buttons || []
          }]
        }
      }
    }
  }

  /**
   * Build receipt template message
   */
  receipt(data: {
    recipient_name: string
    order_number: string
    currency: string
    payment_method: string
    order_url?: string
    timestamp?: string
    elements: Array<{
      title: string
      subtitle?: string
      quantity?: number
      price: number
      currency?: string
      image_url?: string
    }>
    summary: {
      subtotal?: number
      shipping_cost?: number
      total_tax?: number
      total_cost: number
    }
  }): any {
    return {
      attachment: {
        type: 'template',
        payload: {
          template_type: 'receipt',
          ...data
        }
      }
    }
  }
}

// Export singleton instance
export const facebookMessageBuilder = new FacebookMessageBuilder()