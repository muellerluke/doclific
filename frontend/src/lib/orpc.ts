import type { RouterClient } from '@orpc/server';
import { createORPCClient } from '@orpc/client';
import { RPCLink } from '@orpc/client/fetch';
import type { Router } from '../../../src/server/router';
import { createTanstackQueryUtils } from '@orpc/tanstack-query';

const link = new RPCLink({
	url: `http://localhost:${window.PORT ?? 6767}/rpc`,
	headers: { Authorization: window.localStorage.getItem('token') || '' },
});

export const orpc: RouterClient<Router> = createORPCClient(link);
export const orpcTs = createTanstackQueryUtils(orpc);
