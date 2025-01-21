import OpenAI from "openai";
import { NextResponse } from "next/server";
const TIMESTAMP_REGEX =
  /^\[(\d{1,2}\/\d{1,2}\/\d{2,4}),\s*(\d{2}:\d{2}:\d{2})\]/;
const SYMBOL_REGEX = /[^\p{L}\p{N}\s]/gu;
const EMOJI_REGEX = /(?:\p{Emoji_Presentation}|\p{Emoji}\uFE0F)/gu;
const MESSAGE_PATTERN = /^\[.*?\]\s*([^:]+):\s*(.*)$/;
const SYSTEM_PATTERNS = [
  /image omitted/i,
  /GIF omitted/i,
  /video omitted/i,
  /document omitted/i,
  /This message was deleted/i,
  /Messages and calls are end-to-end encrypted/i,
  /was added/i,
  /<This message was edited>/i,
  /\d+ pages/i,
  /audio omitted/i,
  /sticker omitted/i,
  /contact card omitted/i,
  /location shared/i,
];

interface MessageStats {
  totalMessages: number;
  averageLength: number;
  timeStats: {
    earlyBird: number;
    nightOwl: number;
    mostActiveHour: string;
    hourlyActivity: Record<string, number>;
  };
  mediaStats: {
    images: number;
    gifs: number;
    videos: number;
  };
  senderStats: Record<string, number>;
  mostActiveSender: {
    name: string;
    messageCount: number;
  };
}

interface ChatInsights {
  emoji_personality?: string;
  conversation_style: string;
  media_personality?: string;
  conversation_achievements: string[];
}

interface SentimentAnalysis {
  relationship_type: string;
  communication_style: string;
  dominant_emotions: string[];
  key_themes: string[];
  relationship_highlights: string[];
  conversation_quality: number;
  potential_milestones: string[];
  conversation_vibe: string;
  compatibility_score: number;
  conversation_personality: {
    energy_level: string;
    communication_depth: string;
    emotional_expression: string;
    humor_style: string;
    conversation_pace: string;
  };
  relationship_dynamics: {
    mutual_interests: string[];
    conversation_patterns: string[];
    growth_areas: string[];
    unique_characteristics: string[];
  };
  memorable_moments: {
    peak_interaction_times: string[];
    special_occasions: string[];
    inside_jokes_detected: number;
  };
  engagement_metrics: {
    response_consistency: number;
    conversation_depth_score: number;
    emotional_synchronization: number;
    shared_language_patterns: string[];
  };
}
const formatAnalysisForDownload = (analysis: Analysis) => {
  return {
    summary: {
      totalMessages: analysis.localAnalysis.message_stats.totalMessages,
      timeframe: "2024",
      topEmojis: Object.entries(analysis.emojiFrequency)
        .slice(0, 5)
        .map(([emoji, count]) => ({ emoji, count })),
      topWords: analysis.localAnalysis.top_5_words,
      topPhrases: analysis.localAnalysis.top_5_phrases,
      messageStats: analysis.localAnalysis.message_stats,
      insights: analysis.localAnalysis.insights,
      sentimentAnalysis: analysis.sentimentAnalysis,
    },
    generatedAt: new Date().toISOString(),
    version: "2024.1",
  };
};

const preprocessText = (text: string): string => {
  return text
    .split("\n")
    .filter((line) => !line.startsWith("System Message:"))
    .map((line) => line.trim())
    .filter((line) => line.length > 0)
    .join("\n");
};

const getHourFromTimestamp = (timestamp: string): number | null => {
  const match = timestamp.match(TIMESTAMP_REGEX);
  if (match && match[2]) {
    const hour = parseInt(match[2].split(":")[0]);
    return hour;
  }
  return null;
};

const findPhrases = (messageContent: string): Record<string, number> => {
  const phrases: Record<string, number> = {};

  if (SYSTEM_PATTERNS.some((pattern) => pattern.test(messageContent))) {
    return phrases;
  }

  const words = messageContent
    .split(/\s+/)
    .filter(
      (word) =>
        word.length > 0 &&
        !EMOJI_REGEX.test(word) &&
        !SYSTEM_PATTERNS.some((pattern) => pattern.test(word))
    );
  for (let len = 2; len <= 5; len++) {
    for (let i = 0; i <= words.length - len; i++) {
      const phrase = words
        .slice(i, i + len)
        .join(" ")
        .toLowerCase();
      if (phrase.length > 10 && !/^[a-z\s]{1,3}$/.test(phrase)) {
        phrases[phrase] = (phrases[phrase] || 0) + 1;
      }
    }
  }

  return phrases;
};

const getTopItems = <T extends string | number>(
  items: Record<string, T>,
  count: number
): Array<{ item: string; count: T }> => {
  return Object.entries(items)
    .sort(([, a], [, b]) => (b as number) - (a as number))
    .slice(0, count)
    .map(([item, count]) => ({
      item,
      count,
    }));
};

const analyzeLocally = (text: string) => {
  const lines = text.split("\n");
  const wordFrequency: Record<string, number> = {};
  const emojiFrequency: Record<string, number> = {};
  const phraseFrequency: Record<string, number> = {};
  const senderStats: Record<string, number> = {};
  const hourlyActivity: Record<string, number> = {};

  const messageStats: MessageStats = {
    totalMessages: 0,
    averageLength: 0,
    timeStats: {
      earlyBird: 0,
      nightOwl: 0,
      mostActiveHour: "00:00",
      hourlyActivity: {},
    },
    mediaStats: {
      images: 0,
      gifs: 0,
      videos: 0,
    },
    senderStats: {},
    mostActiveSender: {
      name: "",
      messageCount: 0,
    },
  };

  let totalLength = 0;

  lines.forEach((line) => {
    const hour = getHourFromTimestamp(line);
    if (hour !== null) {
      const hourStr = hour.toString().padStart(2, "0") + ":00";
      hourlyActivity[hourStr] = (hourlyActivity[hourStr] || 0) + 1;

      if (hour < 6) messageStats.timeStats.earlyBird++;
      if (hour >= 23 || hour < 4) messageStats.timeStats.nightOwl++;
    }

    const match = line.match(MESSAGE_PATTERN);
    if (match) {
      const [, sender, messageContent] = match;
      const cleanSender = sender.trim();
      senderStats[cleanSender] = (senderStats[cleanSender] || 0) + 1;
      if (messageContent.includes("image omitted"))
        messageStats.mediaStats.images++;
      if (messageContent.includes("GIF omitted"))
        messageStats.mediaStats.gifs++;
      if (messageContent.includes("video omitted"))
        messageStats.mediaStats.videos++;
      if (SYSTEM_PATTERNS.some((pattern) => pattern.test(messageContent))) {
        return;
      }

      messageStats.totalMessages++;
      totalLength += messageContent.length;
      const words = messageContent.split(/\s+/);
      words.forEach((word) => {
        if (EMOJI_REGEX.test(word)) {
          for (const char of word.match(EMOJI_REGEX) || []) {
            emojiFrequency[char] = (emojiFrequency[char] || 0) + 1;
          }
        } else {
          const cleanedWord = word.replace(SYMBOL_REGEX, "").toLowerCase();
          if (cleanedWord && cleanedWord.length > 1) {
            wordFrequency[cleanedWord] = (wordFrequency[cleanedWord] || 0) + 1;
          }
        }
      });
      const phrases = findPhrases(messageContent);
      Object.entries(phrases).forEach(([phrase, count]) => {
        phraseFrequency[phrase] = (phraseFrequency[phrase] || 0) + count;
      });
    }
  });
  messageStats.averageLength = totalLength / messageStats.totalMessages;
  messageStats.senderStats = senderStats;
  messageStats.timeStats.hourlyActivity = hourlyActivity;
  const mostActiveHourEntry = Object.entries(hourlyActivity).sort(
    ([, a], [, b]) => b - a
  )[0];
  if (mostActiveHourEntry) {
    messageStats.timeStats.mostActiveHour = mostActiveHourEntry[0];
  }
  const mostActiveSender = Object.entries(senderStats).sort(
    ([, a], [, b]) => b - a
  )[0];
  if (mostActiveSender) {
    messageStats.mostActiveSender = {
      name: mostActiveSender[0],
      messageCount: mostActiveSender[1],
    };
  }
  const topWords = getTopItems(wordFrequency, 5);
  const topPhrases = getTopItems(phraseFrequency, 5);
  const mostUsedEmoji = getTopItems(emojiFrequency, 1)[0];
  const mostUsedWord = topWords[0];
  const mostUsedPhrase = topPhrases[0];
  const insights: ChatInsights = {
    emoji_personality: mostUsedEmoji?.count
      ? `You're ${mostUsedEmoji.count}x more likely to use ${mostUsedEmoji.item} than any other emoji`
      : undefined,
    conversation_style:
      messageStats.averageLength > 50
        ? "You're a detailed storyteller!"
        : "You keep it short and sweet!",
    media_personality:
      messageStats.mediaStats.images > 20
        ? "Visual communicator 📸"
        : undefined,
    conversation_achievements: [],
  };
  if (messageStats.totalMessages > 1000) {
    insights.conversation_achievements.push("Chatting Champion 🏆");
  }
  if (Object.keys(emojiFrequency).length > 20) {
    insights.conversation_achievements.push("Emoji Enthusiast 🎨");
  }
  if (messageStats.mediaStats.gifs > 10) {
    insights.conversation_achievements.push("GIF Master 🎬");
  }

  return {
    wordFrequency: Object.fromEntries(
      Object.entries(wordFrequency)
        .sort(([, a], [, b]) => b - a)
        .slice(0, 20)
    ),
    emojiFrequency: Object.fromEntries(
      Object.entries(emojiFrequency).sort(([, a], [, b]) => b - a)
    ),
    localAnalysis: {
      most_used_emoji: mostUsedEmoji?.item || "",
      most_used_word: mostUsedWord?.item || "",
      top_5_words: topWords.map((w) => w.item),
      most_used_phrase: mostUsedPhrase?.item || "",
      top_5_phrases: topPhrases.map((p) => p.item),
      message_stats: messageStats,
      insights,
    },
  };
};

const getSampleText = (text: string): string => {
  const lines = text.split("\n");
  const totalLines = lines.length;
  const sampleSize = Math.min(200, Math.ceil(totalLines * 0.15));
  const beginning = lines.slice(0, Math.floor(sampleSize / 3));
  const middle = lines.slice(
    Math.floor(totalLines / 2 - sampleSize / 6),
    Math.floor(totalLines / 2 + sampleSize / 6)
  );
  const end = lines.slice(-Math.floor(sampleSize / 3));

  return [...beginning, ...middle, ...end].join("\n");
};

const analyzeSentiment = async (
  openai: OpenAI,
  textSample: string
): Promise<SentimentAnalysis> => {
  const meaningfulSample = textSample
    .split("\n")
    .filter((line) => !SYSTEM_PATTERNS.some((pattern) => pattern.test(line)))
    .join("\n");

  try {
    const completion = await openai.chat.completions.create({
      model: "gpt-4-turbo-preview",
      messages: [
        {
          role: "system",
          content: `Analyze this chat conversation with a focus on creating viral-worthy, shareable insights. Think "Spotify Wrapped" but for conversations. Consider:

1. Conversation Personality:
- Overall vibe and energy
- Unique communication patterns
- Humor style and inside jokes
- Emotional depth and expression

2. Relationship Dynamics:
- Compatibility patterns
- Shared interests and language
- Unique characteristics that make this conversation special
- Growth and connection patterns

3. Memorable Moments:
- Peak interaction times
- Special occasions mentioned
- Inside jokes and recurring themes
- Unique traditions or habits

4. Engagement Quality:
- Response patterns and consistency
- Conversation depth and meaningfulness
- Emotional synchronization
- Shared language and expressions

Provide specific, quotable insights that would make people want to share their results. Focus on positive, uplifting observations that highlight what makes each conversation unique and special.
Respond in a json object following this interface:
interface SentimentAnalysis {
  relationship_type: string;
  communication_style: string;
  dominant_emotions: string[];
  key_themes: string[];
  relationship_highlights: string[];
  conversation_quality: number;
  potential_milestones: string[];
  // New trendy additions
  conversation_vibe: string;
  compatibility_score: number;
  conversation_personality: {
    energy_level: string;
    communication_depth: string;
    emotional_expression: string;
    humor_style: string;
    conversation_pace: string;
  };
  relationship_dynamics: {
    mutual_interests: string[];
    conversation_patterns: string[];
    growth_areas: string[];
    unique_characteristics: string[];
  };
  memorable_moments: {
    peak_interaction_times: string[];
    special_occasions: string[];
    inside_jokes_detected: number;
  };
  engagement_metrics: {
    response_consistency: number;
    conversation_depth_score: number;
    emotional_synchronization: number;
    shared_language_patterns: string[];
  };
}`,
        },
        {
          role: "user",
          content: meaningfulSample,
        },
      ],
      response_format: { type: "json_object" },
      max_tokens: 1500,
      temperature: 0.7,
    });

    const content = completion.choices[0].message.content;
    if (!content) {
      throw new Error("No content received from OpenAI");
    }

    return JSON.parse(content) as SentimentAnalysis;
  } catch (error) {
    console.error("OpenAI API error:", error);
    throw new Error("Failed to analyze sentiment");
  }
};

export async function POST(req: Request): Promise<Response> {
  try {
    const { text } = (await req.json()) as { text: string };
    if (!text) {
      return NextResponse.json({ error: "No text provided." }, { status: 400 });
    }

    const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
    if (!process.env.OPENAI_API_KEY) {
      throw new Error("OpenAI API key not configured");
    }

    const preprocessedText = preprocessText(text);
    const localAnalysis = analyzeLocally(preprocessedText);
    const sampleText = getSampleText(preprocessedText);
    const sentimentAnalysis = await analyzeSentiment(openai, sampleText);

    const formattedAnalysis = formatAnalysisForDownload({
      ...localAnalysis,
      sentimentAnalysis,
    });

    return NextResponse.json(
      {
        result: { ...localAnalysis, sentimentAnalysis },
        downloadFormat: formattedAnalysis,
      },
      { status: 201 }
    );
  } catch (error) {
    console.error("API Error:", error);
    const errorMessage =
      error instanceof Error ? error.message : "Unknown error occurred";
    return NextResponse.json(
      {
        error: errorMessage,
        details: process.env.NODE_ENV === "development" ? error : undefined,
      },
      { status: 500 }
    );
  }
}
