// server/aiCopywritingService.ts

interface CopySuggestion {
  copy: string;
  hashtags: string[];
  tone: string;
}

interface CopyRequest {
  deliverableType: string;
  brandName?: string;
  projectName?: string;
  existingCopy?: string;
  topic?: string;
  tone?: string;
  targetPlatform?: string;
}

export async function generateCopySuggestion(request: CopyRequest): Promise<CopySuggestion | null> {
  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) {
    console.log("[AI Copywriting] OpenAI API key not configured. Set OPENAI_API_KEY in secrets to enable AI suggestions.");
    return null;
  }

  try {
    const platformGuidelines = getPlatformGuidelines(request.deliverableType);
    const prompt = buildPrompt(request, platformGuidelines);

    const response = await fetch("https://api.openai.com/v1/chat/completions", {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "gpt-4o-mini",
        messages: [
          {
            role: "system",
            content: "You are a social media copywriter for a marketing team. Write engaging, on-brand copy for social media posts. Always respond with JSON in the format: { \"copy\": \"...\", \"hashtags\": [\"...\"], \"tone\": \"...\" }"
          },
          { role: "user", content: prompt }
        ],
        temperature: 0.7,
        max_tokens: 500,
        response_format: { type: "json_object" },
      }),
    });

    if (!response.ok) {
      console.error("[AI Copywriting] OpenAI API error:", response.status, await response.text());
      return null;
    }

    const data = await response.json() as { choices: Array<{ message: { content: string } }> };
    const content = data.choices?.[0]?.message?.content;
    if (!content) return null;

    const parsed = JSON.parse(content);
    return {
      copy: parsed.copy || "",
      hashtags: parsed.hashtags || [],
      tone: parsed.tone || request.tone || "professional",
    };
  } catch (error) {
    console.error("[AI Copywriting] Error generating copy:", error);
    return null;
  }
}

function getPlatformGuidelines(deliverableType: string): string {
  const guidelines: Record<string, string> = {
    INSTAGRAM_POST: "Instagram posts: 2200 char limit. Use line breaks for readability. Hashtags at the end (up to 30). Include a call-to-action.",
    INSTAGRAM_STORY: "Instagram Stories: Keep text very short (1-2 sentences). Use emotive language. Include a clear CTA.",
    INSTAGRAM_REEL: "Instagram Reels: Short, punchy captions. Trending-friendly. Hook in first line. 5-10 relevant hashtags.",
    FACEBOOK_POST: "Facebook posts: Conversational tone. 1-3 paragraphs. Include a question to boost engagement. 2-5 hashtags.",
    TIKTOK_POST: "TikTok: Short, trendy captions. Use trending sounds/references. 3-5 hashtags. Keep it casual and fun.",
    LINKEDIN_POST: "LinkedIn: Professional tone. Start with a hook. Share insights or lessons. 3-5 industry hashtags. 1300 char ideal.",
    TWITTER_POST: "Twitter/X: 280 char limit. Concise and impactful. 1-3 hashtags. Include a CTA or thought-provoking statement.",
    EDM_GRAPHIC: "Email subject line + preview text. Keep subject under 50 chars. Create urgency or curiosity.",
    WEBSITE_BANNER: "Website banner copy: Very short headline (5-8 words) + subheadline (10-15 words). Clear value proposition.",
    EVENT_MATERIAL: "Event promotional copy: Include event name, date, key benefits. Create excitement and urgency.",
  };
  return guidelines[deliverableType] || "Write engaging marketing copy appropriate for the platform.";
}

function buildPrompt(request: CopyRequest, platformGuidelines: string): string {
  let prompt = `Write social media copy for a ${request.deliverableType.replace(/_/g, ' ').toLowerCase()}.\n\n`;
  prompt += `Platform guidelines: ${platformGuidelines}\n\n`;
  
  if (request.brandName) prompt += `Brand: ${request.brandName}\n`;
  if (request.projectName) prompt += `Project/Campaign: ${request.projectName}\n`;
  if (request.topic) prompt += `Topic: ${request.topic}\n`;
  if (request.tone) prompt += `Desired tone: ${request.tone}\n`;
  if (request.existingCopy) prompt += `Existing draft to improve: ${request.existingCopy}\n`;
  
  prompt += `\nGenerate engaging copy with relevant hashtags. Return JSON with "copy", "hashtags" (array of strings without # prefix), and "tone" (the tone you used).`;
  
  return prompt;
}