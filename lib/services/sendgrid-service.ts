import sgMail from '@sendgrid/mail';

sgMail.setApiKey(process.env.SENDGRID_API_KEY || '');

export async function sendEmail(to: string, subject: string, html: string) {
  const msg = {
    to,
    from: 'noreply@nnh.ae', // بريدك الإلكتروني المسجل في SendGrid
    subject,
    html,
  };

  try {
    await sgMail.send(msg);
    console.log('Email sent successfully');
  } catch (error) {
    console.error('Failed to send email:', error);
    throw new Error('Failed to send email');
  }
}