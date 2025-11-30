/**
 * Welcome Email Template for New Admin Users
 * Sent when a new admin account is created
 */

export interface WelcomeEmailData {
  name: string;
  email: string;
  temporaryPassword: string;
  adminUrl: string;
  frontendUrl: string;
}

/**
 * Generate HTML for welcome admin email
 */
export function generateWelcomeAdminEmail(data: WelcomeEmailData): string {
  const { name, email, temporaryPassword, adminUrl, frontendUrl } = data;

  return `
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Welcome to CoST Knowledge Hub</title>
</head>
<body style="margin: 0; padding: 0; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif; background-color: #f5f5f5;">
  <table role="presentation" style="width: 100%; border-collapse: collapse;">
    <tr>
      <td align="center" style="padding: 40px 0;">
        <table role="presentation" style="width: 600px; max-width: 100%; border-collapse: collapse; background-color: #ffffff; border-radius: 12px; box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);">
          <!-- Header -->
          <tr>
            <td style="padding: 40px 40px 20px 40px; text-align: center; background: linear-gradient(135deg, #0066cc 0%, #004499 100%); border-radius: 12px 12px 0 0;">
              <h1 style="margin: 0; color: #ffffff; font-size: 28px; font-weight: 600;">
                Welcome to CoST Knowledge Hub
              </h1>
              <p style="margin: 10px 0 0 0; color: rgba(255, 255, 255, 0.9); font-size: 16px;">
                Infrastructure Transparency Initiative
              </p>
            </td>
          </tr>

          <!-- Content -->
          <tr>
            <td style="padding: 40px;">
              <p style="margin: 0 0 20px 0; color: #333333; font-size: 16px; line-height: 1.6;">
                Hello <strong>${name}</strong>,
              </p>

              <p style="margin: 0 0 20px 0; color: #333333; font-size: 16px; line-height: 1.6;">
                Your administrator account has been created for the CoST Knowledge Hub. You now have access to manage resources, topics, and system settings.
              </p>

              <!-- Credentials Box -->
              <div style="background-color: #f8f9fa; border: 1px solid #e9ecef; border-radius: 8px; padding: 24px; margin: 24px 0;">
                <h3 style="margin: 0 0 16px 0; color: #333333; font-size: 16px; font-weight: 600;">
                  Your Login Credentials
                </h3>
                <table role="presentation" style="width: 100%; border-collapse: collapse;">
                  <tr>
                    <td style="padding: 8px 0; color: #666666; font-size: 14px; width: 120px;">Email:</td>
                    <td style="padding: 8px 0; color: #333333; font-size: 14px; font-weight: 500;">${email}</td>
                  </tr>
                  <tr>
                    <td style="padding: 8px 0; color: #666666; font-size: 14px;">Temporary Password:</td>
                    <td style="padding: 8px 0;">
                      <code style="background-color: #fff3cd; color: #856404; padding: 4px 8px; border-radius: 4px; font-family: monospace; font-size: 14px;">${temporaryPassword}</code>
                    </td>
                  </tr>
                </table>
              </div>

              <!-- Warning -->
              <div style="background-color: #fff3cd; border-left: 4px solid #ffc107; padding: 16px; margin: 24px 0; border-radius: 0 8px 8px 0;">
                <p style="margin: 0; color: #856404; font-size: 14px; line-height: 1.5;">
                  <strong>Important:</strong> Please change your password after your first login for security purposes.
                </p>
              </div>

              <!-- Links -->
              <h3 style="margin: 24px 0 16px 0; color: #333333; font-size: 16px; font-weight: 600;">
                Quick Links
              </h3>

              <!-- Admin Panel Button -->
              <table role="presentation" style="width: 100%; border-collapse: collapse; margin-bottom: 12px;">
                <tr>
                  <td>
                    <a href="${adminUrl}" style="display: inline-block; background-color: #0066cc; color: #ffffff; text-decoration: none; padding: 14px 28px; border-radius: 8px; font-size: 16px; font-weight: 500;">
                      Access Admin Panel
                    </a>
                  </td>
                </tr>
              </table>

              <!-- Frontend Link -->
              <table role="presentation" style="width: 100%; border-collapse: collapse;">
                <tr>
                  <td>
                    <a href="${frontendUrl}" style="display: inline-block; background-color: #28a745; color: #ffffff; text-decoration: none; padding: 14px 28px; border-radius: 8px; font-size: 16px; font-weight: 500;">
                      View Public Knowledge Hub
                    </a>
                  </td>
                </tr>
              </table>

              <!-- URLs as text (for email clients that block links) -->
              <div style="margin-top: 24px; padding: 16px; background-color: #f8f9fa; border-radius: 8px;">
                <p style="margin: 0 0 8px 0; color: #666666; font-size: 12px;">If the buttons don't work, copy and paste these URLs:</p>
                <p style="margin: 0 0 4px 0; color: #333333; font-size: 12px; word-break: break-all;">
                  <strong>Admin Panel:</strong> ${adminUrl}
                </p>
                <p style="margin: 0; color: #333333; font-size: 12px; word-break: break-all;">
                  <strong>Knowledge Hub:</strong> ${frontendUrl}
                </p>
              </div>
            </td>
          </tr>

          <!-- Footer -->
          <tr>
            <td style="padding: 24px 40px; background-color: #f8f9fa; border-radius: 0 0 12px 12px; text-align: center;">
              <p style="margin: 0 0 8px 0; color: #666666; font-size: 14px;">
                CoST - Infrastructure Transparency Initiative
              </p>
              <p style="margin: 0; color: #999999; font-size: 12px;">
                This is an automated message. Please do not reply to this email.
              </p>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>
`;
}
