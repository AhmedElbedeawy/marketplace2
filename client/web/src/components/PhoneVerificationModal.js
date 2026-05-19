import React, { useState, useRef, useEffect } from 'react';
import {
  Dialog, DialogTitle, DialogContent, DialogActions,
  Button, TextField, Typography, Box, Alert, CircularProgress,
  IconButton
} from '@mui/material';
import { Close as CloseIcon, Phone as PhoneIcon, CheckCircle as CheckIcon } from '@mui/icons-material';
import {
  RecaptchaVerifier,
  signInWithPhoneNumber,
  PhoneAuthProvider,
  signInWithCredential
} from 'firebase/auth';
import { firebaseAuth } from '../utils/firebase';
import api from '../utils/api';

/**
 * PhoneVerificationModal
 *
 * Props:
 *   open          – boolean
 *   onClose       – called when user dismisses without verifying
 *   onVerified    – called after backend confirms verification
 *   initialPhone  – optional pre-fill
 *   title         – optional override
 *   language      – 'ar' | 'en'
 */
const PhoneVerificationModal = ({
  open,
  onClose,
  onVerified,
  initialPhone = '',
  title,
  language = 'en',
}) => {
  const isAr = language === 'ar';
  const [phone, setPhone] = useState(initialPhone);
  const [code, setCode] = useState('');
  const [step, setStep] = useState('phone'); // 'phone' | 'code' | 'done'
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [confirmationResult, setConfirmationResult] = useState(null);
  const recaptchaContainerRef = useRef(null);
  const recaptchaVerifierRef = useRef(null);

  // Reset state when dialog opens
  useEffect(() => {
    if (open) {
      setPhone(initialPhone);
      setCode('');
      setStep('phone');
      setError('');
      setConfirmationResult(null);
    }
  }, [open, initialPhone]);

  // Clean up reCAPTCHA on unmount
  useEffect(() => {
    return () => {
      if (recaptchaVerifierRef.current) {
        try { recaptchaVerifierRef.current.clear(); } catch (_) {}
        recaptchaVerifierRef.current = null;
      }
    };
  }, []);

  const getOrCreateRecaptcha = () => {
    if (recaptchaVerifierRef.current) return recaptchaVerifierRef.current;
    recaptchaVerifierRef.current = new RecaptchaVerifier(
      firebaseAuth,
      recaptchaContainerRef.current,
      { size: 'invisible' }
    );
    return recaptchaVerifierRef.current;
  };

  const handleSendCode = async () => {
    const trimmed = phone.trim();
    if (!trimmed) {
      setError(isAr ? 'أدخل رقم الهاتف' : 'Please enter a phone number.');
      return;
    }
    if (!/^\+\d{7,15}$/.test(trimmed)) {
      setError(isAr ? 'الصيغة: +966XXXXXXXXX' : 'Use international format: +966XXXXXXXXX');
      return;
    }

    setError('');
    setLoading(true);
    try {
      const verifier = getOrCreateRecaptcha();
      const result = await signInWithPhoneNumber(firebaseAuth, trimmed, verifier);
      setConfirmationResult(result);
      setStep('code');
    } catch (err) {
      // Clear verifier on error so it can be recreated
      try { recaptchaVerifierRef.current?.clear(); } catch (_) {}
      recaptchaVerifierRef.current = null;
      setError(err.message || (isAr ? 'فشل إرسال الرمز' : 'Failed to send code. Check the number and try again.'));
    } finally {
      setLoading(false);
    }
  };

  const handleVerifyCode = async () => {
    const trimmed = code.trim();
    if (trimmed.length !== 6) {
      setError(isAr ? 'أدخل الرمز المكون من 6 أرقام' : 'Enter the 6-digit code.');
      return;
    }
    setError('');
    setLoading(true);
    try {
      const credential = PhoneAuthProvider.credential(
        confirmationResult.verificationId,
        trimmed
      );
      const fbResult = await signInWithCredential(firebaseAuth, credential);
      const idToken = await fbResult.user.getIdToken();

      // Send idToken to our backend
      const response = await api.post('/auth/verify-phone', { idToken });
      if (response.data?.user) {
        // Persist updated user into localStorage so the rest of the app reflects it
        const stored = localStorage.getItem('user');
        if (stored) {
          const parsed = JSON.parse(stored);
          const merged = { ...parsed, ...response.data.user };
          localStorage.setItem('user', JSON.stringify(merged));
          window.dispatchEvent(new Event('authChange'));
        }
      }

      setStep('done');
      setTimeout(() => { onVerified(); }, 800);
    } catch (err) {
      setError(err.response?.data?.message || err.message || (isAr ? 'رمز غير صحيح' : 'Invalid code. Please try again.'));
    } finally {
      setLoading(false);
    }
  };

  const titleText = title || (isAr ? 'تحقق من رقم الهاتف' : 'Verify your phone number');

  return (
    <Dialog open={open} onClose={onClose} maxWidth="xs" fullWidth>
      {/* Invisible reCAPTCHA container */}
      <div ref={recaptchaContainerRef} id="recaptcha-container" />

      <DialogTitle sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
        <PhoneIcon sx={{ color: '#FF7A00' }} />
        <Box sx={{ flex: 1 }}>{titleText}</Box>
        <IconButton onClick={onClose} size="small">
          <CloseIcon fontSize="small" />
        </IconButton>
      </DialogTitle>

      <DialogContent>
        {error && <Alert severity="error" sx={{ mb: 2 }}>{error}</Alert>}

        {step === 'phone' && (
          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2, pt: 1 }}>
            <Typography variant="body2" color="text.secondary">
              {isAr
                ? 'أدخل رقم هاتفك بالصيغة الدولية لاستقبال رمز التحقق'
                : 'Enter your phone number in international format to receive a verification code.'}
            </Typography>
            <TextField
              fullWidth
              label={isAr ? 'رقم الهاتف' : 'Phone number'}
              placeholder="+966XXXXXXXXX"
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              inputProps={{ dir: 'ltr' }}
              disabled={loading}
            />
          </Box>
        )}

        {step === 'code' && (
          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2, pt: 1 }}>
            <Typography variant="body2" color="text.secondary">
              {isAr
                ? `أُرسل رمز التحقق إلى ${phone}`
                : `A verification code was sent to ${phone}`}
            </Typography>
            <TextField
              fullWidth
              label={isAr ? 'رمز التحقق' : 'Verification code'}
              placeholder="123456"
              value={code}
              onChange={(e) => setCode(e.target.value.replace(/\D/g, '').slice(0, 6))}
              inputProps={{ dir: 'ltr', maxLength: 6 }}
              disabled={loading}
            />
            <Button
              variant="text"
              size="small"
              onClick={() => { setStep('phone'); setCode(''); setError(''); }}
              sx={{ alignSelf: 'flex-start', color: '#FF7A00', textTransform: 'none' }}
            >
              {isAr ? 'تغيير الرقم / إعادة الإرسال' : 'Change number / Resend'}
            </Button>
          </Box>
        )}

        {step === 'done' && (
          <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: 'center', py: 2, gap: 1 }}>
            <CheckIcon sx={{ color: 'success.main', fontSize: 48 }} />
            <Typography fontWeight={600} color="success.main">
              {isAr ? 'تم التحقق بنجاح!' : 'Phone verified successfully!'}
            </Typography>
          </Box>
        )}
      </DialogContent>

      {step !== 'done' && (
        <DialogActions sx={{ px: 3, pb: 2 }}>
          <Button onClick={onClose} disabled={loading} sx={{ color: '#666', textTransform: 'none' }}>
            {isAr ? 'إلغاء' : 'Cancel'}
          </Button>
          <Button
            variant="contained"
            onClick={step === 'phone' ? handleSendCode : handleVerifyCode}
            disabled={loading}
            sx={{ bgcolor: '#FF7A00', '&:hover': { bgcolor: '#E66E00' }, textTransform: 'none', minWidth: 120 }}
          >
            {loading
              ? <CircularProgress size={20} color="inherit" />
              : step === 'phone'
                ? (isAr ? 'إرسال الرمز' : 'Send code')
                : (isAr ? 'تحقق' : 'Verify')}
          </Button>
        </DialogActions>
      )}
    </Dialog>
  );
};

export default PhoneVerificationModal;
