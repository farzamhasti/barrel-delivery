import { Router } from "express";
import { invokeLLM } from "../_core/llm";

const router = Router();

interface ReceiptExtractionRequest {
  imageBase64: string;
}

interface ExtractedOrderData {
  checkNumber: string | null;
  table: string | null;
  guests: number | null;
  server: string | null;
  date: string | null;
  time: string | null;
  deliveryAddress: string | null;
  phoneNumber: string | null;
  items: Array<{
    name: string;
    quantity: number;
    notes: string;
  }>;
}

router.post("/extract-receipt", async (req, res) => {
  try {
    const { imageBase64 } = req.body as ReceiptExtractionRequest;

    if (!imageBase64) {
      return res.status(400).json({ error: "Missing imageBase64" });
    }

    const response = await invokeLLM({
      messages: [
        {
          role: "user",
          content: [
            {
              type: "image_url",
              image_url: {
                url: `data:image/jpeg;base64,${imageBase64}`,
              },
            },
            {
              type: "text",
              text: `Extract order information from this Aloha POS receipt and return ONLY a JSON object with no explanation or markdown:
{
  "checkNumber": "string",
  "table": "string",
  "guests": number,
  "server": "string",
  "date": "string",
  "time": "string",
  "deliveryAddress": "string",
  "phoneNumber": "string",
  "items": [
    { "name": "string", "quantity": number, "notes": "string" }
  ]
}
Rules:
- Items must be food and drink only
- Ignore lines like TRAINING, DO NOT PREPARE, and any non-food text
- If an item appears multiple times on the receipt, combine them into one item with the correct quantity
- If a line is indented under a food item (like "Mild" under "Wings"), treat it as a note for that item
- Extract the full delivery address if present on the receipt and put it in deliveryAddress
- Extract the customer phone number if present on the receipt and put it in phoneNumber
- If deliveryAddress is not found, use null
- If phoneNumber is not found, use null — phone number is optional
- If any other field is not found, use null
- Return valid JSON only — no explanation, no markdown backticks`,
            },
          ],
        },
      ],
    });

    const content = response.choices[0]?.message?.content;
    if (!content) {
      return res.status(400).json({ error: "Failed to extract receipt data" });
    }

    const contentStr = typeof content === "string" ? content : "";
    const jsonMatch = contentStr.match(/\{[\s\S]*\}/);
    if (!jsonMatch) {
      return res.status(400).json({ error: "Could not parse receipt data" });
    }

    const extractedData: ExtractedOrderData = JSON.parse(jsonMatch[0]);
    res.json(extractedData);
  } catch (error) {
    console.error("Receipt extraction error:", error);
    res.status(500).json({
      error: error instanceof Error ? error.message : "Failed to extract receipt",
    });
  }
});

export default router;
