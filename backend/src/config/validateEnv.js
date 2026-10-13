function validateEnv(env = process.env) {
  const problems = [];
  const warnings = [];
  const secret = env.JWT_SECRET || '';
  const production = env.NODE_ENV === 'production';

  if (!secret) {
    problems.push('JWT_SECRET is missing.');
  } else if (production && (secret.length < 32 || /change_this|secret|password|123456/i.test(secret))) {
    problems.push('JWT_SECRET must be a random string of at least 32 characters (anyone who knows it can forge logins).');
  }

  if (production) {
    if (!/^https:\/\//.test(env.FRONTEND_URL || '')) {
      problems.push('FRONTEND_URL must be the https:// address people open (for example https://sems-uptm.afifnajmi.com).');
    }
    if (!env.TRUST_PROXY) {
      warnings.push('TRUST_PROXY is not set. Behind a tunnel or proxy every visitor will look like one IP address and share one rate limit.');
    }
    if (!env.DB_PASSWORD) {
      warnings.push('DB_PASSWORD is empty. Fine on a private laptop, not on a shared server.');
    }
  }
  if (!env.GMAIL_USER || !env.GMAIL_APP_PASSWORD) {
    warnings.push('GMAIL_USER / GMAIL_APP_PASSWORD are empty, so signup, forgot password and email change cannot send their 6-digit codes.');
  }

  return { problems, warnings };
}

module.exports = { validateEnv };
