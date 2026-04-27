import { invokeLLM } from './_core/llm';

export interface ConvertedReceipt {
  checkNumber: string;
  restaurantName: string;
  items: Array<{
    name: string;
    quantity?: number;
    price?: string;
  }>;
  subtotal?: string;
  tax?: string;
  total?: string;
  date?: string;
  time?: string;
  address?: string;
  phone?: string;
  notes?: string;
}

/**
 * Convert a receipt photo to a clean digital receipt using LLM vision
 * @param receiptImageData - Base64 encoded receipt image or URL
 * @returns Converted receipt data
 */
export async function convertReceiptImage(receiptImageData: string): Promise<ConvertedReceipt> {
  try {
    console.log('[receiptConverter] Starting receipt image conversion');

    // Determine if input is base64 or URL
    let imageContent: any;
    if (receiptImageData.startsWith('data:image')) {
      // It's base64 data
      imageContent = {
        type: 'image_url',
        image_url: {
          url: receiptImageData,
          detail: 'high',
        },
      };
    } else if (receiptImageData.startsWith('http')) {
      // It's a URL
      imageContent = {
        type: 'image_url',
        image_url: {
          url: receiptImageData,
          detail: 'high',
        },
      };
    } else {
      throw new Error('Invalid image data format');
    }

    // Use LLM with vision to analyze the receipt image
    const response = await invokeLLM({
      messages: [
        {
          role: 'system',
          content: `You are a receipt OCR specialist. Analyze the receipt image and extract all relevant information. 
          Return a JSON object with the following structure:
          {
            "checkNumber": "check number from receipt",
            "restaurantName": "restaurant name",
            "items": [{"name": "item name", "quantity": number, "price": "price"}],
            "subtotal": "subtotal amount",
            "tax": "tax amount",
            "total": "total amount",
            "date": "date from receipt",
            "time": "time from receipt",
            "address": "address if present",
            "phone": "phone number if present",
            "notes": "any special notes or instructions"
          }
          Extract only what is clearly visible on the receipt. Use null for missing fields.`,
        },
        {
          role: 'user',
          content: [
            {
              type: 'text',
              text: 'Please analyze this receipt image and extract all information into the specified JSON format.',
            },
            imageContent,
          ],
        },
      ],
      response_format: {
        type: 'json_schema',
        json_schema: {
          name: 'receipt_data',
          strict: true,
          schema: {
            type: 'object',
            properties: {
              checkNumber: { type: 'string', description: 'Check/order number' },
              restaurantName: { type: 'string', description: 'Restaurant name' },
              items: {
                type: 'array',
                items: {
                  type: 'object',
                  properties: {
                    name: { type: 'string' },
                    quantity: { type: ['number', 'null'] },
                    price: { type: ['string', 'null'] },
                  },
                  required: ['name'],
                },
              },
              subtotal: { type: ['string', 'null'] },
              tax: { type: ['string', 'null'] },
              total: { type: ['string', 'null'] },
              date: { type: ['string', 'null'] },
              time: { type: ['string', 'null'] },
              address: { type: ['string', 'null'] },
              phone: { type: ['string', 'null'] },
              notes: { type: ['string', 'null'] },
            },
            required: ['checkNumber', 'restaurantName', 'items'],
            additionalProperties: false,
          },
        },
      },
    });

    const content = response.choices[0].message.content;
    if (typeof content !== 'string') {
      throw new Error('Invalid response format from LLM');
    }

    let convertedData: ConvertedReceipt;
    try {
      convertedData = JSON.parse(content) as ConvertedReceipt;
    } catch (parseError) {
      const jsonMatch = content.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        try {
          convertedData = JSON.parse(jsonMatch[0]) as ConvertedReceipt;
        } catch (retryError) {
          console.error('[receiptConverter] Failed to parse extracted JSON:', retryError);
          throw new Error('Failed to parse LLM response as JSON');
        }
      } else {
        console.error('[receiptConverter] Failed to parse JSON response:', parseError);
        throw new Error('LLM response does not contain valid JSON');
      }
    }
    console.log('[receiptConverter] Receipt conversion complete:', convertedData);

    return convertedData;
  } catch (error) {
    console.error('[receiptConverter] Error converting receipt:', error);
    throw error;
  }
}

/**
 * Generate an HTML representation of a converted receipt
 * @param receipt - Converted receipt data
 * @returns HTML string
 */
export function generateReceiptHTML(receipt: ConvertedReceipt): string {
  const itemsHTML = receipt.items
    .map(
      (item) => `
    <tr>
      <td style="padding: 8px; border-bottom: 1px solid #ddd;">${item.name}</td>
      <td style="padding: 8px; border-bottom: 1px solid #ddd; text-align: center;">${item.quantity || 1}</td>
      <td style="padding: 8px; border-bottom: 1px solid #ddd; text-align: right;">${item.price || 'N/A'}</td>
    </tr>
  `
    )
    .join('');

  return `
    <!DOCTYPE html>
    <html>
    <head>
      <style>
        body { font-family: monospace; max-width: 400px; margin: 0 auto; padding: 20px; }
        .receipt { border: 1px solid #333; padding: 20px; background: white; }
        .header { text-align: center; margin-bottom: 20px; }
        .restaurant { font-weight: bold; font-size: 16px; }
        .check-number { font-size: 12px; color: #666; margin-top: 5px; }
        .items { width: 100%; margin: 20px 0; }
        .items th { text-align: left; padding: 8px; border-bottom: 2px solid #333; }
        .totals { margin-top: 20px; text-align: right; }
        .total-line { display: flex; justify-content: space-between; padding: 8px 0; }
        .total-amount { font-weight: bold; font-size: 14px; }
        .footer { text-align: center; margin-top: 20px; font-size: 12px; color: #666; }
      </style>
    </head>
    <body>
      <div class="receipt">
        <div class="header">
          <div class="restaurant">${receipt.restaurantName || 'Restaurant'}</div>
          <div class="check-number">Check #${receipt.checkNumber}</div>
          ${receipt.date ? `<div class="check-number">${receipt.date}${receipt.time ? ` ${receipt.time}` : ''}</div>` : ''}
        </div>

        <table class="items">
          <thead>
            <tr>
              <th>Item</th>
              <th style="text-align: center;">Qty</th>
              <th style="text-align: right;">Price</th>
            </tr>
          </thead>
          <tbody>
            ${itemsHTML}
          </tbody>
        </table>

        <div class="totals">
          ${receipt.subtotal ? `<div class="total-line"><span>Subtotal:</span><span>${receipt.subtotal}</span></div>` : ''}
          ${receipt.tax ? `<div class="total-line"><span>Tax:</span><span>${receipt.tax}</span></div>` : ''}
          ${receipt.total ? `<div class="total-line total-amount"><span>Total:</span><span>${receipt.total}</span></div>` : ''}
        </div>

        ${receipt.notes ? `<div class="footer">${receipt.notes}</div>` : ''}
      </div>
    </body>
    </html>
  `;
}
