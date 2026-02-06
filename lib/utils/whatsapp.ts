/**
 * Generate WhatsApp Web URL with pre-filled message
 * @param phoneNumber - Phone number in international format (without + sign)
 * @param message - Message to pre-fill
 * @returns WhatsApp Web URL
 */
export function generateWhatsAppLink(phoneNumber: string, message: string): string {
    // Remove any non-numeric characters
    const cleanNumber = phoneNumber.replace(/\D/g, '')

    // Encode the message for URL
    const encodedMessage = encodeURIComponent(message)

    // Generate WhatsApp Web URL
    return `https://wa.me/${cleanNumber}?text=${encodedMessage}`
}

/**
 * Replace template variables in message
 * @param template - Message template with {{variable}} placeholders
 * @param variables - Object with variable values
 * @returns Message with variables replaced
 */
export function replaceTemplateVariables(
    template: string,
    variables: Record<string, string>
): string {
    let message = template

    Object.entries(variables).forEach(([key, value]) => {
        const regex = new RegExp(`{{${key}}}`, 'g')
        message = message.replace(regex, value)
    })

    return message
}

/**
 * Format phone number for display
 * @param phoneNumber - Phone number
 * @returns Formatted phone number
 */
export function formatPhoneNumber(phoneNumber: string): string {
    const cleaned = phoneNumber.replace(/\D/g, '')

    if (cleaned.length === 10) {
        return `+91 ${cleaned.slice(0, 5)} ${cleaned.slice(5)}`
    }

    return phoneNumber
}
