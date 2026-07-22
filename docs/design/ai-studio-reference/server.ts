import express from "express";
import path from "path";
import { createServer as createViteServer } from "vite";
import { GoogleGenAI } from "@google/genai";
import dotenv from "dotenv";

dotenv.config();

let aiClient: GoogleGenAI | null = null;

function getGeminiClient(): GoogleGenAI {
  if (!aiClient) {
    const key = process.env.GEMINI_API_KEY;
    if (!key) {
      throw new Error("GEMINI_API_KEY environment variable is required but was not found.");
    }
    aiClient = new GoogleGenAI({
      apiKey: key,
      httpOptions: {
        headers: {
          'User-Agent': 'aistudio-build',
        }
      }
    });
  }
  return aiClient;
}

async function startServer() {
  const app = express();
  const PORT = 3000;

  app.use(express.json());

  // API Route for ZIGI AI Insights
  app.post("/api/gemini/insights", async (req, res) => {
    try {
      const { clientName, sector, kam, ltv, activeProjects, openPipeline, systemPrompt, userMessage } = req.body;
      
      const ai = getGeminiClient();

      const prompt = `
Client Profile:
- Name: ${clientName}
- Sector: ${sector}
- Key Account Manager: ${kam}
- Lifetime Value (LTV): ${ltv}
- Active Projects count: ${activeProjects}
- Open Pipeline value: ${openPipeline}

Context:
${systemPrompt || "Provide a short, 2-sentence strategic CRM recommendation (in Spanish) for this client, starting with high-impact initiatives based on their profile. Keep it highly tactical and professional, like a top sales consultant."}

User query:
${userMessage || "Genera el insight estratégico actual."}
`;

      const response = await ai.models.generateContent({
        model: "gemini-3.5-flash",
        contents: prompt,
      });

      return res.json({ text: response.text });
    } catch (error: any) {
      console.error("Gemini Error:", error);
      return res.status(500).json({ error: error.message || "Error generating insights" });
    }
  });

  // API Route for general chat with ZIGI AI
  app.post("/api/gemini/chat", async (req, res) => {
    try {
      const { messages, clientContext } = req.body;
      
      const ai = getGeminiClient();

      const systemInstruction = `
You are ZIGI AI, a brilliant strategic CRM sales assistant built into Izango 360.
You assist account managers in optimizing relationships, growing revenue, and proposing solutions.
The current active client being reviewed is: ${JSON.stringify(clientContext)}.
Respond always in Spanish, in a highly professional, encouraging, and clear tone. Keep answers under 150 words unless asked for a draft.
If asked to write emails or proposals, structure them cleanly.
`;

      const contents = messages.map((m: any) => ({
        role: m.role === "assistant" ? "model" : "user",
        parts: [{ text: m.content }]
      }));

      const response = await ai.models.generateContent({
        model: "gemini-3.5-flash",
        contents,
        config: {
          systemInstruction,
        }
      });

      return res.json({ text: response.text });
    } catch (error: any) {
      console.error("Gemini Chat Error:", error);
      return res.status(500).json({ error: error.message || "Error during chat session" });
    }
  });

  // Vite middleware for development
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*', (req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Server running on http://0.0.0.0:${PORT}`);
  });
}

startServer();
