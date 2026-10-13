require('dotenv').config();
const { validateEnv } = require('./src/config/validateEnv');

const { problems, warnings } = validateEnv();
warnings.forEach((w) => console.warn(`[config warning] ${w}`));
if (problems.length > 0) {
  problems.forEach((p) => console.error(`[config error] ${p}`));
  console.error('SEMS backend will not start until these are fixed (see backend/.env.example).');
  process.exit(1);
}

const app = require('./src/app');

const PORT = process.env.PORT || 5000;

app.listen(PORT, () => {
  console.log(`SEMS backend running on http://localhost:${PORT} (${process.env.NODE_ENV || 'development'})`);
});
