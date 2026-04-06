import { GoogleGenerativeAI } from '@google/generative-ai';

const API_KEY = 'AIzaSyAOgcBrTlkrxFiHeB0k7hW4EGx2MOr-SZU'; // From user's .env
const genAI = new GoogleGenerativeAI(API_KEY);

async function test() {
  const model = genAI.getGenerativeModel({ model: "gemini-1.5-pro" });
  
  const text = `
    Nasi Goreng Spesial 25.000
    Es Teh Manis 5.000
    Subtotal 30.000
    Tax 10% 3.000
    Service Charge 1.500
    Discount -2.000
    Total 32.500
  `;

  const prompt = `
    You are a receipt parsing assistant. Extract the information from the following Indonesian receipt text.
    
    Look for:
    1. Individual food/drink menu items and their final prices. DO NOT include dates, phone numbers, or meaningless numbers here.
    2. Taxes (e.g. PB1, PPN), usually a percentage or fixed amount. Get the total tax amount in currency.
    3. Service Charges (e.g. Service 5%), get the total service charge amount.
    4. Discounts (e.g. Diskon, Promo), get the total discount amount (return as a positive number).
    
    Return ONLY a valid JSON object with this exact structure:
    {
      "items": [{"name": "Nasi Goreng", "price": 25000}, {"name": "Es Teh", "price": 5000}],
      "tax": 3000,
      "serviceCharge": 1500,
      "discount": 0
    }
    
    If tax, serviceCharge, or discount are not found, set them to 0. Ignore the total/subtotal lines themselves.
    
    Receipt Text:
    ${text}
  `;

  try {
    console.log("Generating...");
    const result = await model.generateContent(prompt);
    const response = await result.response;
    console.log("Raw Response:");
    console.log(response.text());
    const jsonText = response.text().replace(/```json|```/g, '').trim();
    console.log("Parsed JSON:");
    console.log(JSON.parse(jsonText));
  } catch (error) {
    console.error("Error:", error);
  }
}

test();
