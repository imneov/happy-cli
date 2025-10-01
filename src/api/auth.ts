import axios from 'axios';
import { encodeBase64, encodeBase64Url, authChallenge } from './encryption';
import { configuration } from '@/configuration';
import * as tunnel from 'tunnel';
import type { AxiosRequestConfig } from 'axios';

// Create proxy agent if HTTP proxy is configured
function getProxyConfig(): Pick<AxiosRequestConfig, 'httpsAgent' | 'httpAgent' | 'proxy'> | {} {
  const proxyUrl = process.env.http_proxy || process.env.HTTP_PROXY || '';
  const proxyMatch = proxyUrl.match(/https?:\/\/([^:]+):(\d+)/);

  if (proxyMatch) {
    const [, host, port] = proxyMatch;
    return {
      httpsAgent: tunnel.httpsOverHttp({
        proxy: { host, port: parseInt(port, 10) }
      }),
      httpAgent: tunnel.httpOverHttp({
        proxy: { host, port: parseInt(port, 10) }
      }),
      proxy: false
    };
  }

  return {};
}

const proxyConfig = getProxyConfig();

/**
 * Note: This function is deprecated. Use readPrivateKey/writePrivateKey from persistence module instead.
 * Kept for backward compatibility only.
 */
export async function getOrCreateSecretKey(): Promise<Uint8Array> {
  throw new Error('getOrCreateSecretKey is deprecated. Use readPrivateKey/writePrivateKey from persistence module.');
}

/**
 * Authenticate with the server and obtain an auth token
 * @param serverUrl - The URL of the server to authenticate with
 * @param secret - The secret key to use for authentication
 * @returns The authentication token
 */
export async function authGetToken(secret: Uint8Array): Promise<string> {
  const { challenge, publicKey, signature } = authChallenge(secret);
  
  const response = await axios.post(`${configuration.serverUrl}/v1/auth`, {
    challenge: encodeBase64(challenge),
    publicKey: encodeBase64(publicKey),
    signature: encodeBase64(signature)
  }, {
    ...proxyConfig
  });

  if (!response.data.success || !response.data.token) {
    throw new Error('Authentication failed');
  }

  return response.data.token;
}

/**
 * Generate a URL for the mobile app to connect to the server
 * @param secret - The secret key to use for authentication
 * @returns The URL for the mobile app to connect to the server
 */
export function generateAppUrl(secret: Uint8Array): string {
  const secretBase64Url = encodeBase64Url(secret);
  return `handy://${secretBase64Url}`;
}