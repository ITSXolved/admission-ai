import { clsx, type ClassValue } from "clsx"
import { twMerge } from "tailwind-merge"

export function cn(...inputs: ClassValue[]) {
    return twMerge(clsx(inputs))
}

/**
 * Format date to readable string
 */
export function formatDate(date: string | Date, includeTime = false): string {
    const d = new Date(date)

    if (includeTime) {
        return d.toLocaleString('en-IN', {
            day: '2-digit',
            month: 'short',
            year: 'numeric',
            hour: '2-digit',
            minute: '2-digit'
        })
    }

    return d.toLocaleDateString('en-IN', {
        day: '2-digit',
        month: 'short',
        year: 'numeric'
    })
}

/**
 * Format time duration in seconds to readable string
 */
export function formatDuration(seconds: number): string {
    const hours = Math.floor(seconds / 3600)
    const minutes = Math.floor((seconds % 3600) / 60)
    const secs = seconds % 60

    if (hours > 0) {
        return `${hours}:${minutes.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`
    }

    return `${minutes}:${secs.toString().padStart(2, '0')}`
}

/**
 * Generate random password
 */
export function generatePassword(length = 8): string {
    const charset = 'abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789'
    let password = ''

    for (let i = 0; i < length; i++) {
        password += charset.charAt(Math.floor(Math.random() * charset.length))
    }

    return password
}

/**
 * Generate username from name
 */
export function generateUsername(firstName: string, lastName: string, id: string): string {
    const cleanFirst = firstName.toLowerCase().replace(/[^a-z]/g, '')
    const cleanLast = lastName.toLowerCase().replace(/[^a-z]/g, '')
    const shortId = id.slice(0, 6)

    return `${cleanFirst}${cleanLast}${shortId}`
}

/**
 * Calculate percentage
 */
export function calculatePercentage(obtained: number, total: number): number {
    if (total === 0) return 0
    return Math.round((obtained / total) * 100 * 100) / 100
}

/**
 * Get status color
 */
export function getStatusColor(status: string): string {
    const colors: Record<string, string> = {
        applied: 'bg-blue-100 text-blue-800',
        appeared_test: 'bg-purple-100 text-purple-800',
        qualified: 'bg-green-100 text-green-800',
        waiting_list: 'bg-yellow-100 text-yellow-800',
        rejected: 'bg-red-100 text-red-800',
        called_for_interview: 'bg-indigo-100 text-indigo-800',
        admitted: 'bg-emerald-100 text-emerald-800',
        not_started: 'bg-gray-100 text-gray-800',
        in_progress: 'bg-blue-100 text-blue-800',
        completed: 'bg-green-100 text-green-800',
        expired: 'bg-red-100 text-red-800'
    }

    return colors[status] || 'bg-gray-100 text-gray-800'
}

/**
 * Get grade display name
 */
export function getGradeDisplay(grade: string): string {
    const gradeMap: Record<string, string> = {
        '1': '1st Grade',
        '2': '2nd Grade',
        '3': '3rd Grade',
        '4': '4th Grade',
        '5': '5th Grade',
        '6': '6th Grade',
        '7': '7th Grade',
        '8': '8th Grade',
        '9': '9th Grade',
        '10': '10th Grade',
        '11': '11th Grade',
        '12': '12th Grade'
    }

    return gradeMap[grade] || grade
}
