import { GoogleGenAI } from "@google/genai";

const apiKey = process.env.API_KEY;

let ai: GoogleGenAI | null = null;
if (apiKey) {
    ai = new GoogleGenAI({ apiKey: apiKey });
} else {
    console.warn("Gemini API key is not configured. AI features will be disabled.");
}

export const generateGreeting = async (keyword: string): Promise<string> => {
    if (!ai) {
        throw new Error("AI 功能因缺少 API 金鑰而無法使用。");
    }

    try {
        const prompt = `請為一張長輩圖，以「${keyword}」為主題，生成一句約 15-25 字、溫馨且充滿祝福的繁體中文賀詞。請直接回覆賀詞本身，不要包含任何引號或多餘的文字。`;
        
        const response = await ai.models.generateContent({
            model: 'gemini-2.5-flash',
            contents: prompt,
        });

        const text = response.text.trim();
        // Clean up potential markdown or quotes sometimes returned by the model
        return text.replace(/^["']|["']$/g, '');
    } catch (error) {
        console.error("Error generating greeting with Gemini:", error);
        throw new Error("AI 生成失敗，請稍後再試。");
    }
};
