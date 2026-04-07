import { genAI } from './gemini';

export interface VoiceParsedItem {
  name: string;
  price: number;
  assigned_to: string[];
}

export const voiceService = {
  /**
   * Parse a voice transcript into structured item data using Gemini AI.
   * The transcript is expected to be in Indonesian.
   * @param transcript - Raw speech-to-text result
   * @param participants - List of current participant names for matching
   * @returns Array of parsed items with name, price, and assigned_to
   */
  async parseVoiceInput(
    transcript: string,
    participants: string[]
  ): Promise<VoiceParsedItem[]> {
    if (!genAI) {
      throw new Error('Gemini API key tidak ditemukan.');
    }

    const model = genAI.getGenerativeModel({ model: 'gemini-2.5-flash' });

    const prompt = `Kamu adalah AI parser untuk aplikasi split bill Indonesia.

DAFTAR PESERTA YANG TERSEDIA:
${participants.length > 0 ? participants.map(p => `- ${p}`).join('\n') : '(belum ada peserta)'}

TEKS SUARA PENGGUNA:
"${transcript}"

Output HANYA valid JSON array, tanpa markdown, tanpa penjelasan:
[{"name":"...","price":0,"assigned_to":["..."]}]

Jika tidak bisa di-parse sama sekali, kembalikan array kosong: []`;

    try {
      const result = await model.generateContent(prompt);
      const response = await result.response;
      const jsonText = response.text().replace(/```json|```/g, '').trim();
      const parsed = JSON.parse(jsonText) as VoiceParsedItem[];

      // Sanitize results
      return (parsed || [])
        .filter((item) => item.name && item.name.trim() !== '')
        .map((item) => ({
          name: item.name.trim(),
          price: Math.max(0, Number(item.price) || 0),
          assigned_to: Array.isArray(item.assigned_to)
            ? item.assigned_to.filter((p) => participants.includes(p))
            : [],
        }));
    } catch (error) {
      console.error('Voice parsing error:', error);
      throw new Error('Gagal memproses suara. Coba ulangi lagi.');
    }
  },
};
