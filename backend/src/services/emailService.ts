import nodemailer from 'nodemailer';

// For demo purposes, we'll use a simple console logger
// In production, you'd configure actual SMTP settings
class EmailService {
  private transporter: nodemailer.Transporter;

  constructor() {
    // Configure for demo - in production, use real SMTP
    this.transporter = nodemailer.createTransport({
      host: process.env.SMTP_HOST || 'smtp.gmail.com',
      port: parseInt(process.env.SMTP_PORT || '587'),
      secure: false,
      auth: {
        user: process.env.SMTP_USER || 'your-email@gmail.com',
        pass: process.env.SMTP_PASS || 'your-app-password'
      }
    });
  }

  async sendOTP(email: string, otp: string, firstName: string): Promise<boolean> {
    try {
      const mailOptions = {
        from: process.env.EMAIL_FROM || 'ColdChain Sentinel <noreply@coldchain.com>',
        to: email,
        subject: 'ColdChain Sentinel - Email Verification Code',
        html: `
          <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
            <div style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); padding: 30px; text-align: center; color: white;">
              <h1 style="margin: 0; font-size: 28px;">ColdChain Sentinel</h1>
              <p style="margin: 10px 0 0 0; opacity: 0.9;">Vaccine Storage Monitoring System</p>
            </div>
            
            <div style="padding: 40px 30px; background: #f9f9f9;">
              <h2 style="color: #333; margin-bottom: 20px;">Email Verification</h2>
              <p style="color: #666; line-height: 1.6; margin-bottom: 30px;">
                Hi ${firstName},<br><br>
                Thank you for signing up for ColdChain Sentinel. To complete your registration, 
                please use the verification code below:
              </p>
              
              <div style="background: white; border: 2px dashed #ddd; padding: 20px; text-align: center; margin: 30px 0;">
                <p style="margin: 0 0 10px 0; color: #666; font-size: 14px;">Your verification code is:</p>
                <div style="font-size: 32px; font-weight: bold; color: #667eea; letter-spacing: 5px; margin: 10px 0;">
                  ${otp}
                </div>
                <p style="margin: 10px 0 0 0; color: #999; font-size: 12px;">This code expires in 10 minutes</p>
              </div>
              
              <div style="background: #fff3cd; border-left: 4px solid #ffc107; padding: 15px; margin: 20px 0;">
                <p style="margin: 0; color: #856404; font-size: 14px;">
                  <strong>Security Notice:</strong> Never share this code with anyone. 
                  Our team will never ask for your verification code.
                </p>
              </div>
              
              <p style="color: #666; line-height: 1.6; margin-top: 30px;">
                After verification, your account will be reviewed by our administrator 
                before you can access the system.
              </p>
            </div>
            
            <div style="background: #333; color: white; padding: 20px; text-align: center;">
              <p style="margin: 0; font-size: 12px;">
                © 2024 ColdChain Sentinel. All rights reserved.<br>
                This is an automated message. Please do not reply to this email.
              </p>
            </div>
          </div>
        `
      };

      // For demo purposes, we'll just log the email
      console.log('📧 Email would be sent:', {
        to: email,
        subject: 'ColdChain Sentinel - Email Verification Code',
        otp: otp
      });

      // In development, just return true without actually sending
      if (process.env.NODE_ENV !== 'production') {
        console.log(`🔢 DEMO OTP for ${email}: ${otp}`);
        return true;
      }

      await this.transporter.sendMail(mailOptions);
      return true;
    } catch (error) {
      console.error('Error sending email:', error);
      return false;
    }
  }

  async sendApprovalNotification(email: string, firstName: string, status: 'approved' | 'rejected'): Promise<boolean> {
    try {
      const subject = status === 'approved' 
        ? 'ColdChain Sentinel - Account Approved!'
        : 'ColdChain Sentinel - Account Registration Status';

      const mailOptions = {
        from: process.env.EMAIL_FROM || 'ColdChain Sentinel <noreply@coldchain.com>',
        to: email,
        subject,
        html: status === 'approved' ? this.getApprovalTemplate(firstName) : this.getRejectionTemplate(firstName)
      };

      console.log('📧 Approval notification would be sent:', {
        to: email,
        subject: subject,
        status: status
      });

      if (process.env.NODE_ENV !== 'production') {
        return true;
      }

      await this.transporter.sendMail(mailOptions);
      return true;
    } catch (error) {
      console.error('Error sending approval notification:', error);
      return false;
    }
  }

  private getApprovalTemplate(firstName: string): string {
    return `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <div style="background: linear-gradient(135deg, #28a745 0%, #20c997 100%); padding: 30px; text-align: center; color: white;">
          <h1 style="margin: 0; font-size: 28px;">Account Approved! 🎉</h1>
          <p style="margin: 10px 0 0 0; opacity: 0.9;">ColdChain Sentinel</p>
        </div>
        
        <div style="padding: 40px 30px; background: #f9f9f9;">
          <h2 style="color: #333; margin-bottom: 20px;">Welcome to ColdChain Sentinel!</h2>
          <p style="color: #666; line-height: 1.6; margin-bottom: 30px;">
            Hi ${firstName},<br><br>
            Great news! Your account has been approved by our administrator. 
            You can now access the ColdChain Sentinel system and start monitoring 
            your vaccine storage facilities.
          </p>
          
          <div style="text-align: center; margin: 30px 0;">
            <a href="${process.env.FRONTEND_URL || 'http://localhost:3000'}/login" 
               style="background: #28a745; color: white; padding: 15px 30px; text-decoration: none; border-radius: 5px; font-weight: bold;">
              Login to Your Account
            </a>
          </div>
          
          <div style="background: #d4edda; border-left: 4px solid #28a745; padding: 15px; margin: 20px 0;">
            <p style="margin: 0; color: #155724; font-size: 14px;">
              <strong>Next Steps:</strong> Log in with your email and password to access the dashboard.
            </p>
          </div>
        </div>
        
        <div style="background: #333; color: white; padding: 20px; text-align: center;">
          <p style="margin: 0; font-size: 12px;">
            © 2024 ColdChain Sentinel. All rights reserved.
          </p>
        </div>
      </div>
    `;
  }

  private getRejectionTemplate(firstName: string): string {
    return `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <div style="background: linear-gradient(135deg, #dc3545 0%, #c82333 100%); padding: 30px; text-align: center; color: white;">
          <h1 style="margin: 0; font-size: 28px;">Account Status Update</h1>
          <p style="margin: 10px 0 0 0; opacity: 0.9;">ColdChain Sentinel</p>
        </div>
        
        <div style="padding: 40px 30px; background: #f9f9f9;">
          <h2 style="color: #333; margin-bottom: 20px;">Registration Status</h2>
          <p style="color: #666; line-height: 1.6; margin-bottom: 30px;">
            Hi ${firstName},<br><br>
            We regret to inform you that your account registration for ColdChain Sentinel 
            has been reviewed and could not be approved at this time.
          </p>
          
          <div style="background: #f8d7da; border-left: 4px solid #dc3545; padding: 15px; margin: 20px 0;">
            <p style="margin: 0; color: #721c24; font-size: 14px;">
              This decision may be due to various factors including incomplete information 
              or not meeting our current requirements. You may contact our support team 
              for more information.
            </p>
          </div>
          
          <p style="color: #666; line-height: 1.6; margin-top: 30px;">
            If you believe this is an error, please contact our support team at 
            support@coldchain.com for assistance.
          </p>
        </div>
        
        <div style="background: #333; color: white; padding: 20px; text-align: center;">
          <p style="margin: 0; font-size: 12px;">
            © 2024 ColdChain Sentinel. All rights reserved.
          </p>
        </div>
      </div>
    `;
  }
}

export const emailService = new EmailService();
