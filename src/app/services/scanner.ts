import { createWorker } from 'tesseract.js';
import { genAI } from './gemini';

export interface ScannedItem {
  name: string;
  price: number;
}

export interface ScannedReceipt {
  items: ScannedItem[];
  tax: number;
  serviceCharge: number;
  discount: number;
}

export const scannerService = {
  async scanReceipt(image: File, onProgress?: (progress: number) => void): Promise<ScannedReceipt> {
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

      if (!genAI) {
        throw new Error('Gemini API key not found. OCR without AI is not supported.');
      }

      return await this.parseWithGemini(text);
    } catch (error) {
      console.error('OCR/AI Error:', error);
      try { await worker.terminate(); } catch (e) { /* ignore */ }
      throw new Error('Gagal memproses struk. Pastikan foto jelas dan coba lagi.');
    }
  },

  async parseWithGemini(text: string): Promise<ScannedReceipt> {
    if (!genAI) return { items: [], tax: 0, serviceCharge: 0, discount: 0 };

    const model = genAI.getGenerativeModel({ model: 'gemini-2.5-flash' });

    const prompt = `Parse this Indonesian food delivery receipt (GrabFood/GoFood/etc) into JSON.

RULES:
- "items": ONLY actual food/drink menu items with price > 0. Each item: {name, price}
- "tax": explicit tax in Rupiah (PPN/PB1/Pajak as a SEPARATE small line). Set 0 if tax is embedded in total ("termasuk pajak" in total line = 0).
- "serviceCharge": SUM of ALL fees (ongkos kirim + biaya pemesanan + biaya kemasan + biaya penanganan & pengiriman + service charge)
- "discount": SUM of ALL discounts as POSITIVE number (diskon ongkir counts as discount, not fee)

NEVER put in "items":
- Platform info (GoFood, GrabFood, Shopee Food)
- Transaction IDs, order codes (GF-517, F-3182173312)
- Dates, times, section headers
- Restaurant name, address, customer name, driver info
- FREE/UPGRADE add-on notes below menu items (e.g. "FREE Nasi Putih R", "UPGRADE Sambal Matah", "Tanpa alat makan") — price 0, customization only
- Payment summary (Subtotal, Total, Tunai, Kembalian, "Bayar pakai Kantong Utama")
- The word "Harga" alone (GoFood label for item price)
- Any delivery/platform fee (→ serviceCharge)
- Any discount (→ discount)

GrabFood pattern: Items under "Rangkuman pesanan", format "Nx [Name]  price". FREE/UPGRADE lines below = ignore.
GoFood pattern: Items under "Detail pembelian". Price appears in "Detail pembayaran" as "Harga  xxx".

Output ONLY valid JSON, no markdown:
{"items":[{"name":"...","price":0}],"tax":0,"serviceCharge":0,"discount":0}

Receipt:
${text}`;


    try {
      const result = await model.generateContent(prompt);
      const response = await result.response;
      const jsonText = response.text().replace(/```json|```/g, '').trim();
      const parsed = JSON.parse(jsonText) as ScannedReceipt;

      // Sanitize: ensure all numeric fields are numbers
      parsed.tax = Number(parsed.tax) || 0;
      parsed.serviceCharge = Number(parsed.serviceCharge) || 0;
      parsed.discount = Number(parsed.discount) || 0;
      parsed.items = (parsed.items || []).filter(
        (item) => item.name && item.price > 0
      );

      return parsed;
    } catch (error) {
      console.error('Gemini parsing error:', error);
      // Return empty result rather than garbage data from a dumb fallback
      return { items: [], tax: 0, serviceCharge: 0, discount: 0 };
    }
  },
};
