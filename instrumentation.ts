import { setGlobalDispatcher, ProxyAgent } from 'undici';

export async function register() {
  if (process.env.NEXT_RUNTIME !== 'nodejs') return;

  const proxy = process.env.HTTPS_PROXY || process.env.HTTP_PROXY;
  if (proxy) {
    setGlobalDispatcher(new ProxyAgent(proxy));
    // eslint-disable-next-line no-console
    console.log(`[proxy] routing fetch through ${proxy}`);
  }
}