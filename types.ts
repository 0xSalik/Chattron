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

interface Analysis {
  wordFrequency: Record<string, number>;
  emojiFrequency: Record<string, number>;
  localAnalysis: {
    most_used_emoji: string;
    most_used_word: string;
    top_5_words: string[];
    most_used_phrase: string;
    top_5_phrases: string[];
    message_stats: MessageStats;
    insights: ChatInsights;
  };
  sentimentAnalysis?: {
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
  };
}
interface StatCardProps {
  icon: React.ElementType;
  title: string;
  value: string | number;
  color?: string;
}
