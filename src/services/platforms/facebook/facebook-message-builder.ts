// src/services/platforms/facebook/facebook-message-builder.ts

import { 
  MessageBuilder, 
  QuickReplyOption, 
  ButtonOption, 
  CarouselItem 
} from '@/types/webhook.types'

export class FacebookMessageBuilder implements MessageBuilder {
  
  /**
   * Create a text message
   */
  text(content: string): any {
    return {
      text: content
    }
  }
  
  /**
   * Create an image message
   */
  image(url: string, caption?: string): any {
    const message: any = {
      attachment: {
        type: 'image',
        payload: {
          url: url,
          is_reusable: true
        }
      }
    }
    
    // Facebook doesn't support caption with image directly
    // Need to send as separate text message
    if (caption) {
      return [
        { text: caption },
        message
      ]
    }
    
    return message
  }
  
  /**
   * Create a video message
   */
  video(url: string, caption?: string): any {
    const message: any = {
      attachment: {
        type: 'video',
        payload: {
          url: url,
          is_reusable: true
        }
      }
    }
    
    if (caption) {
      return [
        { text: caption },
        message
      ]
    }
    
    return message
  }
  
  /**
   * Create an audio message
   */
  audio(url: string): any {
    return {
      attachment: {
        type: 'audio',
        payload: {
          url: url,
          is_reusable: true
        }
      }
    }
  }
  
  /**
   * Create a file attachment
   */
  file(url: string, filename?: string): any {
    return {
      attachment: {
        type: 'file',
        payload: {
          url: url,
          is_reusable: true
        }
      }
    }
  }
  
  /**
   * Create a location message
   */
  location(lat: number, lng: number, title?: string): any {
    // Facebook doesn't support sending location directly
    // Can only receive location from users
    // As workaround, send Google Maps link
    const mapsUrl = `https://www.google.com/maps?q=${lat},${lng}`
    const text = title 
      ? `📍 ${title}\n${mapsUrl}`
      : `📍 Location: ${mapsUrl}`
    
    return {
      text: text
    }
  }
  
  /**
   * Create quick reply buttons
   */
  quickReplies(text: string, options: QuickReplyOption[]): any {
    return {
      text: text,
      quick_replies: options.map(option => ({
        content_type: 'text',
        title: option.title,
        payload: option.payload,
        image_url: option.imageUrl
      }))
    }
  }
  
  /**
   * Create button template
   */
  buttons(text: string, buttons: ButtonOption[]): any {
    return {
      attachment: {
        type: 'template',
        payload: {
          template_type: 'button',
          text: text,
          buttons: buttons.map(button => this.transformButton(button))
        }
      }
    }
  }
  
  /**
   * Create carousel (generic template)
   */
  carousel(items: CarouselItem[]): any {
    return {
      attachment: {
        type: 'template',
        payload: {
          template_type: 'generic',
          elements: items.map(item => ({
            title: item.title,
            subtitle: item.subtitle,
            image_url: item.imageUrl,
            buttons: item.buttons?.map(button => this.transformButton(button)),
            default_action: item.defaultAction ? {
              type: 'web_url',
              url: item.defaultAction.url,
              webview_height_ratio: 'tall'
            } : undefined
          }))
        }
      }
    }
  }
  
  /**
   * Create a receipt template
   */
  receipt(data: {
    recipientName: string
    orderNumber: string
    currency: string
    paymentMethod: string
    items: Array<{
      title: string
      subtitle?: string
      quantity?: number
      price: number
      currency?: string
      imageUrl?: string
    }>
    summary: {
      subtotal?: number
      shippingCost?: number
      totalTax?: number
      totalCost: number
    }
  }): any {
    return {
      attachment: {
        type: 'template',
        payload: {
          template_type: 'receipt',
          recipient_name: data.recipientName,
          order_number: data.orderNumber,
          currency: data.currency,
          payment_method: data.paymentMethod,
          elements: data.items.map(item => ({
            title: item.title,
            subtitle: item.subtitle,
            quantity: item.quantity || 1,
            price: item.price,
            currency: item.currency || data.currency,
            image_url: item.imageUrl
          })),
          summary: {
            subtotal: data.summary.subtotal,
            shipping_cost: data.summary.shippingCost,
            total_tax: data.summary.totalTax,
            total_cost: data.summary.totalCost
          }
        }
      }
    }
  }
  
  /**
   * Create media template (for sending multiple images/videos)
   */
  mediaTemplate(elements: Array<{
    mediaType: 'image' | 'video'
    url?: string
    attachmentId?: string
    buttons?: ButtonOption[]
  }>): any {
    return {
      attachment: {
        type: 'template',
        payload: {
          template_type: 'media',
          elements: elements.map(element => ({
            media_type: element.mediaType,
            url: element.url,
            attachment_id: element.attachmentId,
            buttons: element.buttons?.map(button => this.transformButton(button))
          }))
        }
      }
    }
  }
  
  /**
   * Create airline boarding pass template
   */
  boardingPass(data: {
    introMessage: string
    locale: string
    boardingPass: Array<{
      passengerName: string
      pnrNumber: string
      logo?: string
      aboveBarCodeImage?: string
      flightInfo: {
        flightNumber: string
        departureAirport: {
          code: string
          city: string
          terminal?: string
          gate?: string
        }
        arrivalAirport: {
          code: string
          city: string
        }
        flightSchedule: {
          departureTime: string
          arrivalTime?: string
          boardingTime?: string
        }
      }
    }>
  }): any {
    return {
      attachment: {
        type: 'template',
        payload: {
          template_type: 'airline_boardingpass',
          intro_message: data.introMessage,
          locale: data.locale,
          boarding_pass: data.boardingPass.map(pass => ({
            passenger_name: pass.passengerName,
            pnr_number: pass.pnrNumber,
            logo_image_url: pass.logo,
            above_bar_code_image_url: pass.aboveBarCodeImage,
            flight_info: {
              flight_number: pass.flightInfo.flightNumber,
              departure_airport: {
                airport_code: pass.flightInfo.departureAirport.code,
                city: pass.flightInfo.departureAirport.city,
                terminal: pass.flightInfo.departureAirport.terminal,
                gate: pass.flightInfo.departureAirport.gate
              },
              arrival_airport: {
                airport_code: pass.flightInfo.arrivalAirport.code,
                city: pass.flightInfo.arrivalAirport.city
              },
              flight_schedule: {
                departure_time: pass.flightInfo.flightSchedule.departureTime,
                arrival_time: pass.flightInfo.flightSchedule.arrivalTime,
                boarding_time: pass.flightInfo.flightSchedule.boardingTime
              }
            }
          }))
        }
      }
    }
  }
  
  /**
   * Transform button to Facebook format
   */
  private transformButton(button: ButtonOption): any {
    switch (button.type) {
      case 'url':
        return {
          type: 'web_url',
          url: button.payload,
          title: button.title,
          webview_height_ratio: 'full'
        }
      
      case 'postback':
        return {
          type: 'postback',
          title: button.title,
          payload: button.payload
        }
      
      case 'phone':
        return {
          type: 'phone_number',
          title: button.title,
          payload: button.payload
        }
      
      case 'email':
        // Facebook doesn't have email button type
        // Convert to URL with mailto
        return {
          type: 'web_url',
          url: `mailto:${button.payload}`,
          title: button.title
        }
      
      default:
        return {
          type: 'postback',
          title: button.title,
          payload: button.payload
        }
    }
  }
}

// Export singleton instance
export const facebookMessageBuilder = new FacebookMessageBuilder()