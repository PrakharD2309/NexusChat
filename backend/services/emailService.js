const nodemailer = require('nodemailer');

class EmailService {
  constructor() {
    this.transporter = nodemailer.createTransport({
      host: process.env.SMTP_HOST,
      port: process.env.SMTP_PORT,
      secure: process.env.SMTP_PORT === '465',
      auth: {
        user: process.env.SMTP_USER,
        pass: process.env.SMTP_PASS
      }
    });
  }

  async sendEmail(to, subject, text, html) {
    try {
      const mailOptions = {
        from: process.env.EMAIL_FROM,
        to,
        subject,
        text,
        html
      };

      const info = await this.transporter.sendMail(mailOptions);
      console.log('Email sent:', info.messageId);
      return info;
    } catch (error) {
      console.error('Error sending email:', error);
      throw error;
    }
  }

  async sendCallReminder(to, callDetails) {
    const subject = 'Upcoming Call Reminder';
    const text = `Reminder: You have a scheduled call at ${callDetails.time}`;
    const html = `
      <h1>Call Reminder</h1>
      <p>You have a scheduled call at ${callDetails.time}</p>
      <p>Details:</p>
      <ul>
        <li>Time: ${callDetails.time}</li>
        <li>Duration: ${callDetails.duration}</li>
        <li>Participants: ${callDetails.participants.join(', ')}</li>
      </ul>
    `;

    return this.sendEmail(to, subject, text, html);
  }
}

module.exports = new EmailService(); 