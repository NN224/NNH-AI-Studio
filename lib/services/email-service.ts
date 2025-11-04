import nodemailer from 'nodemailer';

const transporter = nodemailer.createTransport({
  host: 'smtp.hostinger.com',
  port: 465, // أو 587 إذا كنت تستخدم TLS
  secure: true, // true إذا كنت تستخدم SSL
  auth: {
    user: 'noreply@nnh.ae', // بريدك الإلكتروني
    pass: 'your_email_password', // كلمة المرور
  },
});

export async function sendEmail(to: string, subject: string, html: string) {
  const mailOptions = {
    from: '"NNH AI Studio" <noreply@nnh.ae>',
    to,
    subject,
    html,
  };

  try {
    await transporter.sendMail(mailOptions);
    console.log('Email sent successfully');
  } catch (error) {
    console.error('Failed to send email:', error);
    throw new Error('Failed to send email');
  }
}