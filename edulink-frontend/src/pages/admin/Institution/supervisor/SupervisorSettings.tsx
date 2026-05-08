import React, { useState, useEffect } from 'react';
import { Spinner } from 'react-bootstrap';
import { User, Lock, Send, Save, CheckCircle, AlertCircle, Eye, EyeOff } from 'lucide-react';
import styled, { keyframes, css } from 'styled-components';
import { useAuthStore } from '../../../../stores/authStore';
import { authService } from '../../../../services/auth/authService';
import { institutionService } from '../../../../services/institution/institutionService';
import { sanitizeAdminError } from '../../../../utils/adminErrorSanitizer';

/* ─── Animations ──────────────────────────────────────────────────── */
const fadeUp = keyframes`
  from { opacity: 0; transform: translateY(12px); }
  to   { opacity: 1; transform: translateY(0); }
`;

const slideIn = keyframes`
  from { opacity: 0; transform: translateY(-6px); }
  to   { opacity: 1; transform: translateY(0); }
`;

/* ─── Page ────────────────────────────────────────────────────────── */
const Page = styled.div`
  animation: ${fadeUp} 0.3s ease both;
`;

const PageHeader = styled.div`
  margin-bottom: 1.75rem;
  h2 {
    font-size: 20px;
    font-weight: 700;
    color: var(--navy);
    margin: 0 0 4px;
    letter-spacing: -0.025em;
  }
  p {
    font-size: 13.5px;
    color: var(--steel);
    margin: 0;
  }
`;

const Grid = styled.div`
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 14px;

  @media (max-width: 768px) {
    grid-template-columns: 1fr;
  }
`;

/* ─── Card ────────────────────────────────────────────────────────── */
const Card = styled.div<{ $delay?: number }>`
  background: var(--white);
  border: 1px solid var(--border);
  border-radius: 12px;
  overflow: hidden;
  display: flex;
  flex-direction: column;
  animation: ${fadeUp} 0.35s ease both;
  animation-delay: ${p => p.$delay ?? 0}ms;
`;

const CardHead = styled.div`
  display: flex;
  align-items: center;
  gap: 9px;
  padding: 1rem 1.5rem;
  border-bottom: 1px solid var(--border);

  h5 {
    font-size: 14px;
    font-weight: 600;
    color: var(--navy);
    margin: 0;
  }
`;

const HeadIcon = styled.div<{ $bg: string; $color: string }>`
  width: 30px;
  height: 30px;
  border-radius: 7px;
  background: ${p => p.$bg};
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
  color: ${p => p.$color};
`;

const CardBody = styled.div`
  padding: 1.5rem;
  flex: 1;
`;

/* ─── Avatar block ────────────────────────────────────────────────── */
const AvatarBlock = styled.div`
  display: flex;
  align-items: center;
  gap: 13px;
  padding: 14px 16px;
  background: var(--fog);
  border-radius: 10px;
  margin-bottom: 1.4rem;
  border: 1px solid var(--border);
`;

const Avatar = styled.div`
  width: 46px;
  height: 46px;
  border-radius: 11px;
  background: var(--accent);
  color: white;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 16px;
  font-weight: 700;
  flex-shrink: 0;
  letter-spacing: -0.02em;
`;

const AvatarMeta = styled.div`
  strong {
    display: block;
    font-size: 14px;
    font-weight: 600;
    color: var(--navy);
    margin-bottom: 2px;
  }
  span {
    font-size: 12px;
    color: var(--steel);
  }
`;

const RolePill = styled.span`
  margin-left: auto;
  display: inline-flex;
  padding: 3px 10px;
  background: var(--accent-dim);
  color: var(--accent);
  border: 1px solid rgba(47, 111, 237, 0.15);
  border-radius: 20px;
  font-size: 11px;
  font-weight: 600;
  white-space: nowrap;
  flex-shrink: 0;
`;

/* ─── Form elements ───────────────────────────────────────────────── */
const FieldGroup = styled.div`
  display: flex;
  flex-direction: column;
  gap: 5px;
  margin-bottom: 1rem;
`;

const FieldLabel = styled.label`
  font-size: 11px;
  font-weight: 600;
  color: var(--steel);
  text-transform: uppercase;
  letter-spacing: 0.07em;
`;

const NameRow = styled.div`
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 8px;
`;

const Input = styled.input`
  width: 100%;
  padding: 8px 12px;
  font-size: 13.5px;
  color: var(--navy);
  background: var(--white);
  border: 1px solid var(--border);
  border-radius: 8px;
  outline: none;
  transition: border-color 0.14s, box-shadow 0.14s;
  font-family: inherit;

  &::placeholder {
    color: var(--steel);
    opacity: 0.6;
  }

  &:focus {
    border-color: var(--accent);
    box-shadow: 0 0 0 3px rgba(47, 111, 237, 0.1);
  }

  &:disabled {
    background: var(--fog);
    opacity: 0.7;
  }
`;

const PasswordWrap = styled.div`
  position: relative;
`;

const PasswordInput = styled(Input)`
  padding-right: 38px;
`;

const EyeBtn = styled.button`
  position: absolute;
  right: 10px;
  top: 50%;
  transform: translateY(-50%);
  background: none;
  border: none;
  padding: 0;
  color: var(--steel);
  cursor: pointer;
  display: flex;
  align-items: center;
  transition: color 0.12s;
  &:hover { color: var(--navy); }
`;

const Divider = styled.hr`
  border: none;
  border-top: 1px solid var(--border);
  margin: 1.1rem 0;
`;

/* ─── Feedback banner ─────────────────────────────────────────────── */
const Banner = styled.div<{ $type: 'success' | 'danger' }>`
  display: flex;
  align-items: flex-start;
  gap: 9px;
  padding: 10px 13px;
  border-radius: 8px;
  font-size: 13px;
  font-weight: 500;
  margin-bottom: 1.1rem;
  animation: ${slideIn} 0.2s ease both;

  ${p => p.$type === 'success' && css`
    background: #F0FDF4;
    color: #15803D;
    border: 1px solid #BBF7D0;
  `}
  ${p => p.$type === 'danger' && css`
    background: #FEF2F2;
    color: #B91C1C;
    border: 1px solid #FECACA;
  `}
`;

const BannerClose = styled.button`
  margin-left: auto;
  background: none;
  border: none;
  padding: 0;
  font-size: 16px;
  line-height: 1;
  cursor: pointer;
  opacity: 0.5;
  color: inherit;
  &:hover { opacity: 1; }
`;

/* ─── Submit row ──────────────────────────────────────────────────── */
const FormFooter = styled.div`
  display: flex;
  justify-content: flex-end;
  margin-top: 1.25rem;
`;

const SubmitBtn = styled.button<{ $loading?: boolean }>`
  display: inline-flex;
  align-items: center;
  gap: 7px;
  padding: 8px 18px;
  background: var(--accent);
  color: white;
  border: none;
  border-radius: 8px;
  font-size: 13px;
  font-weight: 600;
  cursor: ${p => p.$loading ? 'wait' : 'pointer'};
  transition: opacity 0.14s, transform 0.14s;
  font-family: inherit;

  &:hover:not(:disabled) {
    opacity: 0.9;
    transform: translateY(-1px);
  }

  &:disabled {
    opacity: 0.55;
    cursor: not-allowed;
    transform: none;
  }
`;

/* ─── Password strength ───────────────────────────────────────────── */
const StrengthBar = styled.div`
  display: flex;
  gap: 3px;
  margin-top: 6px;
`;

const StrengthSegment = styled.div<{ $active: boolean; $color: string }>`
  flex: 1;
  height: 3px;
  border-radius: 2px;
  background: ${p => p.$active ? p.$color : 'var(--border)'};
  transition: background 0.2s;
`;

const StrengthLabel = styled.div<{ $color: string }>`
  font-size: 11px;
  color: ${p => p.$color};
  font-weight: 600;
  margin-top: 4px;
`;

function getStrength(pw: string): { score: number; label: string; color: string } {
  if (!pw) return { score: 0, label: '', color: '' };
  let s = 0;
  if (pw.length >= 8) s++;
  if (/[A-Z]/.test(pw)) s++;
  if (/[0-9]/.test(pw)) s++;
  if (/[^A-Za-z0-9]/.test(pw)) s++;
  const map = [
    { label: 'Weak', color: '#DC2626' },
    { label: 'Fair', color: '#D97706' },
    { label: 'Good', color: '#2563EB' },
    { label: 'Strong', color: '#16A34A' },
  ];
  return { score: s, ...map[s - 1] ?? map[0] };
}

/* ─── Component ───────────────────────────────────────────────────── */
const SupervisorSettings: React.FC = () => {
  const { user } = useAuthStore();

  const [profileForm, setProfileForm] = useState({ first_name: '', last_name: '', email: '' });
  const [profileSubmitting, setProfileSubmitting] = useState(false);
  const [profileMessage, setProfileMessage] = useState<{ type: 'success' | 'danger'; text: string } | null>(null);

  const [passwordData, setPasswordData] = useState({ currentPassword: '', newPassword: '', confirmPassword: '' });
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState<{ type: 'success' | 'danger'; text: string } | null>(null);
  const [showPasswords, setShowPasswords] = useState({ current: false, next: false, confirm: false });

  useEffect(() => {
    if (user) {
      setProfileForm({
        first_name: user.firstName || '',
        last_name: user.lastName || '',
        email: user.email || '',
      });
    }
  }, [user]);

  const handleProfileSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;
    const payload: Record<string, string> = {};
    if (profileForm.first_name !== (user.firstName || '')) payload.first_name = profileForm.first_name;
    if (profileForm.last_name !== (user.lastName || '')) payload.last_name = profileForm.last_name;
    if (profileForm.email !== (user.email || '')) payload.email = profileForm.email;

    if (!Object.keys(payload).length) {
      setProfileMessage({ type: 'danger', text: 'No changes to submit.' });
      return;
    }
    try {
      setProfileSubmitting(true);
      setProfileMessage(null);
      await institutionService.requestSupervisorProfileUpdate(payload);
      setProfileMessage({ type: 'success', text: 'Profile update request submitted for admin review.' });
    } catch (err: any) {
      const s = sanitizeAdminError(err);
      setProfileMessage({ type: 'danger', text: s.userMessage || 'Failed to submit profile update request.' });
    } finally {
      setProfileSubmitting(false);
    }
  };

  const handlePasswordChange = async (e: React.FormEvent) => {
    e.preventDefault();
    if (passwordData.newPassword !== passwordData.confirmPassword) {
      setMessage({ type: 'danger', text: 'New passwords do not match.' });
      return;
    }
    try {
      setLoading(true);
      setMessage(null);
      await authService.changePassword({
        new_password: passwordData.newPassword,
        new_password_confirm: passwordData.confirmPassword,
        old_password: passwordData.currentPassword,
      });
      setMessage({ type: 'success', text: 'Password updated successfully.' });
      setPasswordData({ currentPassword: '', newPassword: '', confirmPassword: '' });
    } catch (err: any) {
      const s = sanitizeAdminError(err);
      setMessage({ type: 'danger', text: s.userMessage || 'Failed to update password.' });
    } finally {
      setLoading(false);
    }
  };

  const strength = getStrength(passwordData.newPassword);
  const toggle = (key: keyof typeof showPasswords) =>
    setShowPasswords(p => ({ ...p, [key]: !p[key] }));

  return (
    <Page>
      <PageHeader>
        <h2>Account Settings</h2>
        <p>Manage your profile information and security preferences.</p>
      </PageHeader>

      <Grid>
        {/* ── Profile card ── */}
        <Card $delay={0}>
          <CardHead>
            <HeadIcon $bg="var(--accent-dim)" $color="var(--accent)">
              <User size={15} />
            </HeadIcon>
            <h5>Profile Information</h5>
          </CardHead>
          <CardBody>
            {/* Avatar block */}
            <AvatarBlock>
              <Avatar>
                {user?.firstName?.charAt(0)}{user?.lastName?.charAt(0)}
              </Avatar>
              <AvatarMeta>
                <strong>{user?.firstName} {user?.lastName}</strong>
                <span>{user?.email}</span>
              </AvatarMeta>
              <RolePill>Supervisor</RolePill>
            </AvatarBlock>

            {profileMessage && (
              <Banner $type={profileMessage.type}>
                {profileMessage.type === 'success'
                  ? <CheckCircle size={15} style={{ flexShrink: 0, marginTop: 1 }} />
                  : <AlertCircle size={15} style={{ flexShrink: 0, marginTop: 1 }} />}
                {profileMessage.text}
                <BannerClose onClick={() => setProfileMessage(null)}>×</BannerClose>
              </Banner>
            )}

            <form onSubmit={handleProfileSubmit}>
              <FieldGroup>
                <FieldLabel>Full Name</FieldLabel>
                <NameRow>
                  <Input
                    type="text"
                    value={profileForm.first_name}
                    onChange={e => setProfileForm({ ...profileForm, first_name: e.target.value })}
                    placeholder="First name"
                    disabled={profileSubmitting}
                  />
                  <Input
                    type="text"
                    value={profileForm.last_name}
                    onChange={e => setProfileForm({ ...profileForm, last_name: e.target.value })}
                    placeholder="Last name"
                    disabled={profileSubmitting}
                  />
                </NameRow>
              </FieldGroup>

              <FieldGroup>
                <FieldLabel>Email Address</FieldLabel>
                <Input
                  type="email"
                  value={profileForm.email}
                  onChange={e => setProfileForm({ ...profileForm, email: e.target.value })}
                  placeholder="you@example.edu"
                  disabled={profileSubmitting}
                />
              </FieldGroup>

              <FormFooter>
                <SubmitBtn type="submit" disabled={profileSubmitting} $loading={profileSubmitting}>
                  {profileSubmitting
                    ? <><Spinner size="sm" animation="border" /> Submitting…</>
                    : <><Send size={13} /> Submit Update Request</>}
                </SubmitBtn>
              </FormFooter>
            </form>
          </CardBody>
        </Card>

        {/* ── Security card ── */}
        <Card $delay={55}>
          <CardHead>
            <HeadIcon $bg="#FEF2F2" $color="#DC2626">
              <Lock size={15} />
            </HeadIcon>
            <h5>Security</h5>
          </CardHead>
          <CardBody>
            {message && (
              <Banner $type={message.type}>
                {message.type === 'success'
                  ? <CheckCircle size={15} style={{ flexShrink: 0, marginTop: 1 }} />
                  : <AlertCircle size={15} style={{ flexShrink: 0, marginTop: 1 }} />}
                {message.text}
                <BannerClose onClick={() => setMessage(null)}>×</BannerClose>
              </Banner>
            )}

            <form onSubmit={handlePasswordChange}>
              <FieldGroup>
                <FieldLabel>Current Password</FieldLabel>
                <PasswordWrap>
                  <PasswordInput
                    type={showPasswords.current ? 'text' : 'password'}
                    value={passwordData.currentPassword}
                    onChange={e => setPasswordData({ ...passwordData, currentPassword: e.target.value })}
                    placeholder="Enter current password"
                    required
                    disabled={loading}
                  />
                  <EyeBtn type="button" onClick={() => toggle('current')}>
                    {showPasswords.current ? <EyeOff size={14} /> : <Eye size={14} />}
                  </EyeBtn>
                </PasswordWrap>
              </FieldGroup>

              <Divider />

              <FieldGroup>
                <FieldLabel>New Password</FieldLabel>
                <PasswordWrap>
                  <PasswordInput
                    type={showPasswords.next ? 'text' : 'password'}
                    value={passwordData.newPassword}
                    onChange={e => setPasswordData({ ...passwordData, newPassword: e.target.value })}
                    placeholder="Min. 8 characters"
                    required
                    minLength={8}
                    disabled={loading}
                  />
                  <EyeBtn type="button" onClick={() => toggle('next')}>
                    {showPasswords.next ? <EyeOff size={14} /> : <Eye size={14} />}
                  </EyeBtn>
                </PasswordWrap>
                {passwordData.newPassword && (
                  <>
                    <StrengthBar>
                      {[1, 2, 3, 4].map(n => (
                        <StrengthSegment key={n} $active={strength.score >= n} $color={strength.color} />
                      ))}
                    </StrengthBar>
                    <StrengthLabel $color={strength.color}>{strength.label}</StrengthLabel>
                  </>
                )}
              </FieldGroup>

              <FieldGroup>
                <FieldLabel>Confirm New Password</FieldLabel>
                <PasswordWrap>
                  <PasswordInput
                    type={showPasswords.confirm ? 'text' : 'password'}
                    value={passwordData.confirmPassword}
                    onChange={e => setPasswordData({ ...passwordData, confirmPassword: e.target.value })}
                    placeholder="Repeat new password"
                    required
                    minLength={8}
                    disabled={loading}
                  />
                  <EyeBtn type="button" onClick={() => toggle('confirm')}>
                    {showPasswords.confirm ? <EyeOff size={14} /> : <Eye size={14} />}
                  </EyeBtn>
                </PasswordWrap>
                {passwordData.confirmPassword && passwordData.newPassword !== passwordData.confirmPassword && (
                  <StrengthLabel $color="#DC2626">Passwords don't match</StrengthLabel>
                )}
              </FieldGroup>

              <FormFooter>
                <SubmitBtn type="submit" disabled={loading} $loading={loading}>
                  {loading
                    ? <><Spinner size="sm" animation="border" /> Updating…</>
                    : <><Save size={13} /> Update Password</>}
                </SubmitBtn>
              </FormFooter>
            </form>
          </CardBody>
        </Card>
      </Grid>
    </Page>
  );
};

export default SupervisorSettings;