// Desarrollo: servidor API (con recarga) + Vite en paralelo.
import { spawn } from 'node:child_process';

const correr = (cmd, args) => spawn(cmd, args, { stdio: 'inherit', shell: process.platform === 'win32' });
const api = correr(process.execPath, ['--env-file-if-exists=.env', '--watch', 'server/index.js']);
const web = correr('npx', ['vite', '--config', 'client/vite.config.js']);
const fin = () => { api.kill(); web.kill(); process.exit(); };
process.on('SIGINT', fin);
process.on('SIGTERM', fin);
