import type { RequestHandler } from './$types'
import { buildLlmsTxt } from '$lib/llms'

// Generated per request so the link index carries the real deployment origin.
export const GET: RequestHandler = ({ url }) => {
	return new Response(buildLlmsTxt(url.origin), {
		headers: {
			'content-type': 'text/plain; charset=utf-8',
			'cache-control': 'public, max-age=3600'
		}
	})
}
