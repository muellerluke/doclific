import express from 'express';
import cors from 'cors';
import { RPCHandler } from '@orpc/server/node';
import { onError } from '@orpc/server';
import { router } from './router.js';
import path from 'path';
import { fileURLToPath } from 'url';
import fs from 'fs';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const frontendDist = path.join(__dirname, '../../frontend/dist');

export function startServer(port: number = 6767) {
	const app = express();

	app.use(cors());

	const handler = new RPCHandler(router, {
		interceptors: [
			onError((error) => {
				console.error(error);
			}),
		],
	});

	app.use('/rpc{/*path}', async (req, res, next) => {
		const { matched } = await handler.handle(req, res, {
			prefix: '/rpc',
			context: {},
		});

		if (matched) return;

		next();
	});

	// serve static files in frontend/dist
	app.use((req, res, next) => {
		if (req.url === '/') {
			const html = fs.readFileSync(path.join(frontendDist, 'index.html'), 'utf8');
			res.send(html.replace(': BACKEND_PORT', `: ${port.toString()}`));
		} else {
			express.static(frontendDist)(req, res, next);
		}
	});

	app.get('/{*splat}', (req, res) => {
		const html = fs.readFileSync(path.join(frontendDist, 'index.html'), 'utf8');
		res.send(html.replace(': BACKEND_PORT', `: ${port.toString()}`));
	});

	app.listen(port, () => console.log(`Access your documentation here: http://localhost:${port}`));
}
