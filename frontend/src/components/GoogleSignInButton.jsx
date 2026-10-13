import { useEffect, useRef } from 'react';

export const GOOGLE_SIGN_IN_ENABLED = Boolean(import.meta.env.VITE_GOOGLE_CLIENT_ID);
const CLIENT_ID = import.meta.env.VITE_GOOGLE_CLIENT_ID;

export default function GoogleSignInButton({ onCredential }) {
  const divRef = useRef(null);

  useEffect(() => {
    if (!CLIENT_ID || !window.google?.accounts?.id || !divRef.current) return;

    window.google.accounts.id.initialize({
      client_id: CLIENT_ID,
      callback: (response) => onCredential(response.credential),
    });
    window.google.accounts.id.renderButton(divRef.current, {
      theme: 'outline',
      size: 'large',
      width: 320,
      text: 'continue_with',
    });
  }, [onCredential]);

  if (!CLIENT_ID) return null;

  return <div ref={divRef} className="flex justify-center" />;
}
