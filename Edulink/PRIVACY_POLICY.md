# Privacy Policy - Edulink Platform

## Data Protection & Privacy Compliance

Edulink is committed to protecting user privacy and complying with data protection regulations including GDPR, CCPA, and other applicable privacy laws.

## Privacy-First Security Configuration

### What We DON'T Collect

- **IP Addresses**: We do not store or log IP addresses in user sessions or security events
- **User Agent Strings**: We do not track browser or device information
- **Detailed Metadata**: We only collect minimal metadata necessary for security
- **Location Data**: No geolocation tracking
- **Device Fingerprinting**: No device identification beyond basic security needs

### What We DO Collect (Minimally)

- **Authentication Events**: Login/logout timestamps for security purposes
- **Security Events**: Minimal logging for threat detection (without personal identifiers)
- **Session Management**: Basic session validation without storing personal data
- **Error Logs**: Technical errors for system maintenance (anonymized)

### Data Retention

- **Security Logs**: Automatically deleted after 90 days
- **Session Data**: Cleared when session expires
- **User Data**: Retained only as long as account is active
- **Audit Trails**: Minimal retention for compliance purposes

### Privacy Controls

#### Security Middleware Settings
```python
# Privacy-first security configuration
SECURITY_TRACK_SESSION_IPS = False      # No IP tracking
SECURITY_TRACK_USER_AGENTS = False      # No user agent tracking
SECURITY_LOG_IP_ADDRESSES = False       # No IP logging
SECURITY_LOG_USER_AGENTS = False        # No user agent logging
SECURITY_LOG_DETAILED_METADATA = False  # Minimal metadata only
```

#### Data Protection Features
- **Automatic Data Cleanup**: Old data automatically purged
- **Anonymization**: Personal identifiers removed from logs
- **Minimal Collection**: Only essential data for security
- **Transparent Logging**: Clear audit trail of what's collected

### User Rights

- **Right to Access**: View what data we have about you
- **Right to Deletion**: Request complete data removal
- **Right to Portability**: Export your data
- **Right to Rectification**: Correct inaccurate data
- **Right to Object**: Opt-out of data processing

### Security vs Privacy Balance

Our security measures are designed to:
1. **Protect without invading**: Security without unnecessary data collection
2. **Detect threats minimally**: Identify attacks using pattern analysis, not personal data
3. **Log responsibly**: Only log what's absolutely necessary
4. **Expire automatically**: All security data has automatic expiration

### Compliance Features

- **GDPR Article 25**: Privacy by design and by default
- **Data Minimization**: Collect only what's necessary
- **Purpose Limitation**: Data used only for stated purposes
- **Storage Limitation**: Automatic data deletion
- **Transparency**: Clear documentation of data practices

### Technical Implementation

#### Security Middleware
- Admin paths exempted from security checks for usability
- Rate limiting without personal data storage
- Threat detection using behavioral patterns, not personal identifiers
- Session security without storing sensitive information

#### Data Protection Module
- Automatic anonymization of IP addresses
- Secure hashing of sensitive data
- Regular cleanup of old data
- Privacy-compliant export/deletion tools

### Contact

For privacy-related questions or to exercise your rights:
- Email: privacy@edulink.com
- Data Protection Officer: dpo@edulink.com

### Updates

This privacy policy is reviewed regularly and updated to reflect:
- Changes in data protection laws
- Updates to our security practices
- User feedback and privacy concerns

---

**Last Updated**: January 2025
**Version**: 1.0
**Compliance**: GDPR, CCPA, Privacy by Design