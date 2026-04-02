import { createWorker } from 'tesseract.js';

export interface ScannedItem {
  name: string;
  price: number;
}

export const scannerService = {
  async scanReceipt(image: File, onProgress?: (progress: number) => void): Promise<ScannedItem[]> {
    // In Tesseract.js v7, createWorker handles loading and initialization automatically
    const worker = await createWorker('eng+ind', 1, {
      logger: (m: any) => {
        if (m.status === 'recognizing text' && onProgress) {
          onProgress(Math.round(m.progress * 100));
        }
      },
    });

    try {
      const { data: { text } } = await worker.recognize(image);
      await worker.terminate();

      return this.parseReceiptText(text);
    } catch (error) {
      console.error('OCR Error:', error);
      try {
        await worker.terminate();
      } catch (e) {
        // Ignore termination errors if worker didn't start
      }
      throw new Error('Failed to process receipt image');
    }
  },

  parseReceiptText(text: string): ScannedItem[] {
    const lines = text.split('\n');
    const items: ScannedItem[] = [];

    // Regex to find things that look like prices (e.g. 10.000, 50,00, 12.99)
    // We look for numbers at the end of a line or after some spaces
    const priceRegex = /(\d{1,3}(?:[.,]\d{3})*(?:[.,]\d{2})?)$/;

    lines.forEach(line => {
      const trimmedLine = line.trim();
      if (!trimmedLine) return;

      const match = trimmedLine.match(priceRegex);
      if (match) {
        const priceStr = match[1].replace(/[.,](\d{3})/g, '$1').replace(',', '.');
        const price = parseFloat(priceStr);
        
        // The name is everything before the price
        const namePart = trimmedLine.replace(match[0], '').trim();
        
        // Basic cleanup for the name
        const cleanName = namePart.replace(/[^\w\s-]/g, '').trim();

        if (cleanName && !isNaN(price) && price > 0) {
          items.push({
            name: cleanName,
            price: price
          });
        }
      }
    });

    return items;
  }
};
