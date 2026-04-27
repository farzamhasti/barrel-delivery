import { invokeLLM } from "./_core/llm";

export interface ReceiptData {
  checkNumber: string;
  items: Array<{
    name: string;
    quantity: number;
  }>;
}

/**
 * Analyze a receipt image using LLM to extract check number and items
 * Pure function with no side effects
 */
export async function analyzeReceiptImage(imageUrl: string): Promise<ReceiptData> {
  const response = await invokeLLM({
    messages: [
      {
        role: "system",
        content: `You are a receipt analyzer. Extract ONLY:
1. Check/Order number (the receipt number)
2. List of items with quantities

Return ONLY valid JSON with no additional text:
{
  "checkNumber": "string",
  "items": [{"name": "string", "quantity": number}]
}`,
      },
      {
        role: "user",
        content: [
          {
            type: "text",
            text: "Extract the check number and items from this receipt.",
          },
          {
            type: "image_url",
            image_url: {
              url: imageUrl,
              detail: "high",
            },
          },
        ],
      },
    ],
    response_format: {
      type: "json_schema",
      json_schema: {
        name: "receipt_data",
        strict: true,
        schema: {
          type: "object",
          properties: {
            checkNumber: {
              type: "string",
              description: "The check or order number from the receipt",
            },
            items: {
              type: "array",
              items: {
                type: "object",
                properties: {
                  name: {
                    type: "string",
                    description: "Item name",
                  },
                  quantity: {
                    type: "number",
                    description: "Item quantity",
                  },
                },
                required: ["name", "quantity"],
                additionalProperties: false,
              },
              description: "List of items with quantities",
            },
          },
          required: ["checkNumber", "items"],
          additionalProperties: false,
        },
      },
    },
  });

  const content = response.choices[0].message.content;
  if (typeof content !== "string") {
    throw new Error("Invalid response format from LLM");
  }

  return JSON.parse(content) as ReceiptData;
}
