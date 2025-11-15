import jsPDF from 'jspdf'
import type { GmbAccount, GMBLocation, GMBReview, ActivityLog } from '@/lib/types/database'

interface DashboardStats {
  total_locations: number
  avg_rating: number
  total_reviews: number
  response_rate: number
  pending_reviews: number
  recent_reviews: number
}

interface DashboardData {
  accounts: GmbAccount[]
  locations: GMBLocation[]
  reviews: GMBReview[]
  activities: ActivityLog[]
  stats: DashboardStats | null
}

export async function exportDashboardToPDF(data: DashboardData) {
  const doc = new jsPDF()
  
  // Set up fonts and colors
  const primaryColor = '#000000'
  const secondaryColor = '#666666'
  const accentColor = '#3b82f6'
  
  let yPosition = 20

  // Title
  doc.setFontSize(24)
  doc.setTextColor(primaryColor)
  doc.text('Dashboard Report', 20, yPosition)
  yPosition += 10

  // Date
  doc.setFontSize(10)
  doc.setTextColor(secondaryColor)
  doc.text(`Generated: ${new Date().toLocaleString()}`, 20, yPosition)
  yPosition += 15

  // Stats Overview Section
  doc.setFontSize(16)
  doc.setTextColor(primaryColor)
  doc.text('Overview Statistics', 20, yPosition)
  yPosition += 10

  if (data.stats) {
    doc.setFontSize(10)
    doc.setTextColor(secondaryColor)
    
    const stats = [
      { label: 'Total Accounts', value: data.accounts.length.toString() },
      { label: 'Total Locations', value: data.stats.total_locations.toString() },
      { label: 'Average Rating', value: data.stats.avg_rating?.toFixed(1) || '0.0' },
      { label: 'Response Rate', value: `${Math.round(data.stats.response_rate || 0)}%` },
      { label: 'Pending Reviews', value: data.stats.pending_reviews.toString() },
      { label: 'Total Reviews', value: data.stats.total_reviews.toString() },
    ]

    stats.forEach((stat, index) => {
      const xOffset = (index % 2) * 90
      const yOffset = Math.floor(index / 2) * 8
      
      doc.setTextColor(secondaryColor)
      doc.text(`${stat.label}:`, 25 + xOffset, yPosition + yOffset)
      doc.setTextColor(primaryColor)
      doc.text(stat.value, 70 + xOffset, yPosition + yOffset)
    })
    
    yPosition += 30
  }

  // Locations Section
  if (data.locations.length > 0) {
    doc.setFontSize(16)
    doc.setTextColor(primaryColor)
    doc.text('Business Locations', 20, yPosition)
    yPosition += 10

    doc.setFontSize(10)
    data.locations.forEach((location, index) => {
      if (yPosition > 270) {
        doc.addPage()
        yPosition = 20
      }

      doc.setTextColor(accentColor)
      doc.text(`${index + 1}. ${location.location_name}`, 25, yPosition)
      yPosition += 6

      if (location.address) {
        doc.setTextColor(secondaryColor)
        doc.text(`   Address: ${location.address}`, 25, yPosition)
        yPosition += 6
      }

      if (location.rating) {
        doc.setTextColor(secondaryColor)
        doc.text(
          `   Rating: ${location.rating.toFixed(1)} (${location.review_count || 0} reviews)`,
          25,
          yPosition
        )
        yPosition += 6
      }

      doc.setTextColor(secondaryColor)
      doc.text(`   Status: ${location.is_active ? 'Active' : 'Inactive'}`, 25, yPosition)
      yPosition += 10
    })
  }

  // Recent Reviews Section
  if (data.reviews.length > 0) {
    if (yPosition > 240) {
      doc.addPage()
      yPosition = 20
    }

    doc.setFontSize(16)
    doc.setTextColor(primaryColor)
    doc.text('Recent Reviews', 20, yPosition)
    yPosition += 10

    doc.setFontSize(10)
    data.reviews.slice(0, 5).forEach((review, index) => {
      if (yPosition > 260) {
        doc.addPage()
        yPosition = 20
      }

      // Reviewer name and rating
      doc.setTextColor(primaryColor)
      doc.text(`${review.reviewer_name} - ${'⭐'.repeat(review.rating)}`, 25, yPosition)
      yPosition += 6

      // Review text (truncated)
      if (review.review_text) {
        doc.setTextColor(secondaryColor)
        const reviewText = review.review_text.substring(0, 120)
        const truncated = review.review_text.length > 120 ? '...' : ''
        doc.text(`   "${reviewText}${truncated}"`, 25, yPosition)
        yPosition += 6
      }

      // Location
      doc.setTextColor(secondaryColor)
      doc.text(`   Location: ${review.location_name || 'Unknown'}`, 25, yPosition)
      yPosition += 6

      // Reply status
      const replyStatus = review.has_reply ? 'Replied' : 'Pending reply'
      doc.text(`   Status: ${replyStatus}`, 25, yPosition)
      yPosition += 10
    })
  }

  // Recent Activity Section
  if (data.activities.length > 0) {
    if (yPosition > 240) {
      doc.addPage()
      yPosition = 20
    }

    doc.setFontSize(16)
    doc.setTextColor(primaryColor)
    doc.text('Recent Activity', 20, yPosition)
    yPosition += 10

    doc.setFontSize(10)
    data.activities.forEach((activity) => {
      if (yPosition > 270) {
        doc.addPage()
        yPosition = 20
      }

      doc.setTextColor(secondaryColor)
      const date = new Date(activity.created_at).toLocaleString()
      doc.text(`[${date}] ${activity.activity_message}`, 25, yPosition)
      yPosition += 8
    })
  }

  // Footer
  const pageCount = (doc as any).internal.getNumberOfPages()
  for (let i = 1; i <= pageCount; i++) {
    doc.setPage(i)
    doc.setFontSize(8)
    doc.setTextColor(secondaryColor)
    doc.text(
      `Page ${i} of ${pageCount}`,
      doc.internal.pageSize.getWidth() / 2,
      doc.internal.pageSize.getHeight() - 10,
      { align: 'center' }
    )
  }

  // Save the PDF
  const filename = `dashboard-report-${new Date().toISOString().split('T')[0]}.pdf`
  doc.save(filename)
}

// Alternative: Export to HTML/Canvas based PDF (for better styling)
export async function exportDashboardToStyledPDF(elementId: string) {
  try {
    const html2canvas = (await import('html2canvas')).default
    const element = document.getElementById(elementId)
    
    if (!element) {
      throw new Error('Element not found')
    }

    const canvas = await html2canvas(element, {
      scale: 2,
      useCORS: true,
      logging: false,
    })

    const imgData = canvas.toDataURL('image/png')
    const pdf = new jsPDF({
      orientation: 'portrait',
      unit: 'mm',
      format: 'a4',
    })

    const imgWidth = 210
    const pageHeight = 297
    const imgHeight = (canvas.height * imgWidth) / canvas.width
    let heightLeft = imgHeight
    let position = 0

    pdf.addImage(imgData, 'PNG', 0, position, imgWidth, imgHeight)
    heightLeft -= pageHeight

    while (heightLeft >= 0) {
      position = heightLeft - imgHeight
      pdf.addPage()
      pdf.addImage(imgData, 'PNG', 0, position, imgWidth, imgHeight)
      heightLeft -= pageHeight
    }

    const filename = `dashboard-report-${new Date().toISOString().split('T')[0]}.pdf`
    pdf.save(filename)
  } catch (error) {
    console.error('Error exporting styled PDF:', error)
    throw error
  }
}

