import { describe, expect, it } from 'vitest';
import { esBot } from './portal';

describe('esBot', () => {
  it('reconoce los bots de vista previa de links y los rastreadores', () => {
    for (const ua of [
      'WhatsApp/2.23.20.0 A',
      'facebookexternalhit/1.1 (+http://www.facebook.com/externalhit_uatext.php)',
      'Slackbot-LinkExpanding 1.0 (+https://api.slack.com/robots)',
      'LinkedInBot/1.0 (compatible; Mozilla/5.0; Apache-HttpClient +http://www.linkedin.com)',
      'Twitterbot/1.0',
      'TelegramBot (like TwitterBot)',
      'Mozilla/5.0 (compatible; Googlebot/2.1; +http://www.google.com/bot.html)',
      'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) HeadlessChrome/120.0.0.0 Safari/537.36',
      'Microsoft Office/16.0 (Windows NT 10.0; Microsoft Outlook 16.0.17126; Pro)',
      'curl/8.4.0',
      'node-fetch',
    ]) {
      expect(esBot(ua), ua).toBe(true);
    }
  });

  it('trata como bot un pedido sin navegador identificado', () => {
    expect(esBot(null)).toBe(true);
    expect(esBot('')).toBe(true);
  });

  it('cuenta a las personas, incluido el navegador interno de LinkedIn', () => {
    for (const ua of [
      'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.1 Safari/605.1.15',
      'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
      'Mozilla/5.0 (iPhone; CPU iPhone OS 17_1 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Mobile/15E148 [LinkedInApp]',
      'Mozilla/5.0 (Linux; Android 14; Pixel 8) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Mobile Safari/537.36',
    ]) {
      expect(esBot(ua), ua).toBe(false);
    }
  });
});
