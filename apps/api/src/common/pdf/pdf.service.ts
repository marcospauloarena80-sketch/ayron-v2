import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import puppeteer from 'puppeteer';
import { PdfDocumentData, buildDocumentHtml } from './templates/document.template';

@Injectable()
export class PdfService {
  private readonly logger = new Logger(PdfService.name);

  constructor(private readonly config: ConfigService) {}

  async generateDocument(data: PdfDocumentData): Promise<Buffer> {
    const html = buildDocumentHtml(data);
    const executablePath = this.config.get<string>('PUPPETEER_EXECUTABLE_PATH') || undefined;
    const rawArgs = this.config.get<string>('PUPPETEER_ARGS') || '';
    const timeoutMs = parseInt(this.config.get<string>('PDF_TIMEOUT_MS') || '25000', 10);

    const baseArgs = [
      '--no-sandbox',
      '--disable-setuid-sandbox',
      '--disable-dev-shm-usage',
      '--disable-gpu',
      '--disable-extensions',
      '--single-process',
      '--no-zygote',
    ];
    const extraArgs = rawArgs ? rawArgs.split(',').map(a => a.trim()).filter(Boolean) : [];
    const launchArgs = [...new Set([...baseArgs, ...extraArgs])];

    const launchOpts: Parameters<typeof puppeteer.launch>[0] = {
      headless: true,
      args: launchArgs,
      timeout: timeoutMs,
    };
    if (executablePath) {
      launchOpts.executablePath = executablePath;
      this.logger.debug(`Using system Chromium: ${executablePath}`);
    } else {
      launchOpts.channel = 'chrome';
    }

    let browser: Awaited<ReturnType<typeof puppeteer.launch>> | null = null;
    try {
      try {
        browser = await puppeteer.launch(launchOpts);
      } catch (launchErr) {
        if (executablePath) throw launchErr;
        this.logger.warn('channel=chrome launch failed, retrying without channel');
        const { channel: _ch, ...fallbackOpts } = launchOpts as any;
        browser = await puppeteer.launch(fallbackOpts);
      }

      const page = await browser.newPage();
      page.setDefaultTimeout(timeoutMs);
      await page.setContent(html, { waitUntil: 'networkidle0', timeout: timeoutMs });
      const pdfBuffer = await page.pdf({
        format: 'A4',
        printBackground: true,
        margin: { top: '10mm', bottom: '10mm', left: '10mm', right: '10mm' },
      });
      this.logger.log(`PDF generated OK — ${pdfBuffer.length} bytes`);
      return Buffer.from(pdfBuffer);
    } finally {
      if (browser) {
        try { await browser.close(); } catch { /* ignore */ }
      }
    }
  }
}
