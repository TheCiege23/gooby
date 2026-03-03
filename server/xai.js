import OpenAI from "openai";

const xai = new OpenAI({
  baseURL: "https://api.x.ai/v1",
  apiKey: process.env.XAI_API_KEY || process.env.GROK_API_KEY
});

export async function chat(messages, options = {}) {
  const response = await xai.chat.completions.create({
    model: options.model || "grok-3-mini-fast",
    messages,
    ...(options.responseFormat && { response_format: options.responseFormat }),
    ...(options.maxTokens && { max_tokens: options.maxTokens }),
  });
  return response.choices[0].message.content;
}

export async function analyzeImage(imageUrl, prompt = "Describe this image in detail.") {
  const response = await xai.chat.completions.create({
    model: "grok-2-vision-latest",
    messages: [
      {
        role: "user",
        content: [
          { type: "text", text: prompt },
          { type: "image_url", image_url: { url: imageUrl } }
        ],
      },
    ],
    max_tokens: 500,
  });
  return response.choices[0].message.content;
}

export default xai;
