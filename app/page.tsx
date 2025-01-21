"use client";
import React, { useState } from "react";
import { Button } from "@/components/ui/button";
import { StatCard } from "@/components/ui/statcard";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  MessageCircle,
  Heart,
  Timer,
  Image,
  Smile,
  Award,
  ArrowRight,
  Download,
  User,
  Clock,
  Gift,
  Star,
} from "lucide-react";
import { PageTransition } from "@/components/ui/motion";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from "recharts";

const downloadAnalysis = (analysis: Analysis) => {
  const data = JSON.stringify(analysis, null, 2);
  const blob = new Blob([data], { type: "application/json" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = "chat-wrapped-analysis.json";
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
};

const ChatAnalysisPage: React.FC = () => {
  const [file, setFile] = useState<File | null>(null);
  const [analysis, setAnalysis] = useState<Analysis | null>(null);
  const [loading, setLoading] = useState<boolean>(false);
  const [step, setStep] = useState<number>(1);
  const [uploadProgress, setUploadProgress] = useState<number>(0);
  const [error, setError] = useState<string | null>(null);

  const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = event.target.files?.[0];
    if (selectedFile) {
      setFile(selectedFile);
      setError(null);
      setUploadProgress(100);
    }
  };
  const handleUpload = async () => {
    if (!file) return;
    setLoading(true);
    setError(null);
    setStep(2);
    try {
      const reader = new FileReader();
      reader.onload = async (e) => {
        const text = e.target?.result;
        if (typeof text !== "string") {
          throw new Error("Failed to read file content");
        }
        const response = await fetch("/api/analyze", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ text }),
        });
        if (!response.ok) {
          throw new Error(
            `Analysis failed: ${response.status} ${response.statusText}`
          );
        }
        const data = await response.json();
        setAnalysis(data.result);
        setStep(3);
      };
      reader.onerror = () => {
        throw new Error("Failed to read file");
      };
      reader.readAsText(file);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Analysis failed");
      setStep(1);
    } finally {
      setLoading(false);
    }
  };
  if (step === 3 && analysis) {
    const hourlyActivityData = Object.entries(
      analysis.localAnalysis.message_stats.timeStats.hourlyActivity
    ).map(([hour, count]) => ({
      hour,
      messages: count,
    }));
    return (
      <PageTransition>
        <div className="min-h-screen bg-gradient-to-br from-indigo-900 via-purple-900 to-pink-900 p-6">
          <div className="max-w-6xl mx-auto space-y-8">
            <h1 className="text-4xl font-bold text-center text-white mb-12">
              Your Chat Wrapped ✨
            </h1>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              <StatCard
                icon={MessageCircle}
                title="Total Messages"
                value={analysis.localAnalysis.message_stats.totalMessages}
                color="blue"
              />
              <StatCard
                icon={Timer}
                title="Most Active Hour"
                value={
                  analysis.localAnalysis.message_stats.timeStats.mostActiveHour
                }
                color="purple"
              />
              <StatCard
                icon={Image}
                title="Media Shared"
                value={
                  analysis.localAnalysis.message_stats.mediaStats.images +
                  analysis.localAnalysis.message_stats.mediaStats.videos
                }
                color="pink"
              />
            </div>
            <Card className="bg-white/5 backdrop-blur-sm">
              <CardHeader>
                <CardTitle className="text-white">Hourly Activity</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="h-64 mt-4">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={hourlyActivityData}>
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis dataKey="hour" stroke="#fff" />
                      <YAxis stroke="#fff" />
                      <Tooltip />
                      <Bar dataKey="messages" fill="#8884d8" />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </CardContent>
            </Card>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mt-8">
              <Card className="bg-white/5 backdrop-blur-sm">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2 text-white">
                    <MessageCircle className="w-5 h-5" />
                    Most Used Words
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="flex flex-wrap gap-2">
                    {Object.entries(analysis.wordFrequency)
                      .slice(0, 10)
                      .map(([word, count]) => (
                        <span
                          key={word}
                          className="px-3 py-1 bg-white/10 rounded-full text-white text-sm"
                          style={{
                            fontSize: `${Math.min(
                              1.5 + (count as number) / 100,
                              2
                            )}rem`,
                          }}
                        >
                          {word}
                        </span>
                      ))}
                  </div>
                </CardContent>
              </Card>
              <Card className="bg-white/5 backdrop-blur-sm">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2 text-white">
                    <MessageCircle className="w-5 h-5" />
                    Favorite Phrases
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <ul className="space-y-2 text-white">
                    {analysis.localAnalysis.top_5_phrases.map((phrase) => (
                      <li key={phrase} className="flex items-center gap-2">
                        <span className="text-xl">💬</span>
                        {phrase}
                      </li>
                    ))}
                  </ul>
                </CardContent>
              </Card>
              <Card className="bg-white/5 backdrop-blur-sm">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2 text-white">
                    <Smile className="w-5 h-5" />
                    Emoji Personality
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    <div className="text-6xl text-center">
                      {analysis.localAnalysis.most_used_emoji || "😊"}
                    </div>
                    <p className="text-white text-center">
                      {analysis.localAnalysis.insights.emoji_personality ||
                        "Your favorite emoji!"}
                    </p>
                  </div>
                </CardContent>
              </Card>
            </div>
            {analysis.sentimentAnalysis?.conversation_personality && (
              <Card className="bg-white/5 backdrop-blur-sm mt-8">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2 text-white">
                    <User className="w-5 h-5" />
                    Conversation Personality
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6 text-white">
                    <div className="space-y-4">
                      <div className="bg-white/10 rounded-lg p-4">
                        <h4 className="font-semibold mb-2">
                          Your Conversation Vibe
                        </h4>
                        <p className="text-2xl">
                          {analysis.sentimentAnalysis.conversation_vibe}
                        </p>
                      </div>
                      <div className="bg-white/10 rounded-lg p-4">
                        <h4 className="font-semibold mb-2">Chemistry Score</h4>
                        <div className="flex items-center gap-2">
                          <div className="text-3xl">
                            {analysis.sentimentAnalysis.compatibility_score}%
                          </div>
                          <span>compatibility</span>
                        </div>
                      </div>
                    </div>
                    <div className="space-y-4">
                      <h4 className="font-semibold">Conversation Style</h4>
                      <div className="space-y-2">
                        {Object.entries(
                          analysis.sentimentAnalysis.conversation_personality
                        ).map(([key, value]) => (
                          <div
                            key={key}
                            className="flex items-center justify-between bg-white/5 p-2 rounded"
                          >
                            <span className="capitalize">
                              {key.replace(/_/g, " ")}
                            </span>
                            <span className="font-semibold">{value}</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            )}
            {analysis.sentimentAnalysis?.memorable_moments && (
              <Card className="bg-white/5 backdrop-blur-sm mt-8">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2 text-white">
                    <Star className="w-5 h-5" />
                    Conversation Highlights
                  </CardTitle>
                </CardHeader>
                <CardContent className="text-white">
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                    <div className="bg-white/10 rounded-lg p-4">
                      <h4 className="font-semibold mb-2">Peak Chat Times</h4>
                      <ul className="space-y-2">
                        {analysis.sentimentAnalysis.memorable_moments.peak_interaction_times.map(
                          (time) => (
                            <li key={time} className="flex items-center gap-2">
                              <Clock className="w-4 h-4" />
                              {time}
                            </li>
                          )
                        )}
                      </ul>
                    </div>
                    <div className="bg-white/10 rounded-lg p-4">
                      <h4 className="font-semibold mb-2">Special Occasions</h4>
                      <ul className="space-y-2">
                        {analysis.sentimentAnalysis.memorable_moments.special_occasions.map(
                          (occasion) => (
                            <li
                              key={occasion}
                              className="flex items-center gap-2"
                            >
                              <Gift className="w-4 h-4" />
                              {occasion}
                            </li>
                          )
                        )}
                      </ul>
                    </div>
                    <div className="bg-white/10 rounded-lg p-4">
                      <h4 className="font-semibold mb-2">
                        Inside Jokes Detected
                      </h4>
                      <div className="text-4xl font-bold text-center">
                        {
                          analysis.sentimentAnalysis.memorable_moments
                            .inside_jokes_detected
                        }
                      </div>
                      <p className="text-center text-sm mt-2">shared moments</p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            )}
            <div className="flex justify-center gap-4 mt-8">
              <Button
                variant="outline"
                onClick={() => downloadAnalysis(analysis)}
              >
                <Download className="w-4 h-4 mr-2" />
                Download Summary
              </Button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <Card className="bg-white/5 backdrop-blur-sm">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2 text-white">
                    <Smile className="w-5 h-5" />
                    Most Used Emojis
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="flex flex-wrap gap-4 text-4xl justify-center">
                    {Object.entries(analysis.emojiFrequency)
                      .slice(0, 5)
                      // eslint-disable-next-line @typescript-eslint/no-unused-vars
                      .map(([emoji, count]) => (
                        <div
                          key={emoji}
                          className="bg-white/10 p-3 rounded-lg hover:bg-white/20 transition-all duration-300"
                        >
                          {emoji}{" "}
                          {/* This ensures the actual emoji is displayed */}
                        </div>
                      ))}
                  </div>
                </CardContent>
              </Card>

              <Card className="bg-white/5 backdrop-blur-sm">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2 text-white">
                    <Award className="w-5 h-5" />
                    Achievements
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <ul className="space-y-2 text-white">
                    {analysis.localAnalysis.insights.conversation_achievements.map(
                      (achievement) => (
                        <li
                          key={achievement}
                          className="flex items-center gap-2"
                        >
                          <span className="text-xl">🏆</span>
                          {achievement}
                        </li>
                      )
                    )}
                  </ul>
                </CardContent>
              </Card>
            </div>
            {analysis.sentimentAnalysis && (
              <Card className="bg-white/5 backdrop-blur-sm mt-8">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2 text-white">
                    <Heart className="w-5 h-5" />
                    Relationship Insights
                  </CardTitle>
                </CardHeader>
                <CardContent className="text-white">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div>
                      <h3 className="font-semibold mb-2">
                        Relationship Type:{" "}
                        {analysis.sentimentAnalysis.relationship_type}
                      </h3>
                      <p className="text-sm mb-4">
                        Style: {analysis.sentimentAnalysis.communication_style}
                      </p>
                      <div className="mb-4">
                        <h4 className="font-semibold mb-1">Key Themes:</h4>
                        <ul className="list-disc list-inside">
                          {analysis.sentimentAnalysis.key_themes.map(
                            (theme) => (
                              <li key={theme}>{theme}</li>
                            )
                          )}
                        </ul>
                      </div>
                    </div>
                    <div>
                      <div className="mb-4">
                        <h4 className="font-semibold mb-1">
                          Dominant Emotions:
                        </h4>
                        <div className="flex flex-wrap gap-2">
                          {analysis.sentimentAnalysis.dominant_emotions.map(
                            (emotion) => (
                              <span
                                key={emotion}
                                className="px-2 py-1 bg-white/10 rounded-full text-sm"
                              >
                                {emotion}
                              </span>
                            )
                          )}
                        </div>
                      </div>
                      <div>
                        <h4 className="font-semibold mb-1">Milestones:</h4>
                        <ul className="list-disc list-inside">
                          {analysis.sentimentAnalysis.potential_milestones.map(
                            (milestone) => (
                              <li key={milestone}>{milestone}</li>
                            )
                          )}
                        </ul>
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            )}

            <Button
              onClick={() => setStep(1)}
              className="mt-8 mx-auto block"
              variant="secondary"
            >
              Analyze Another Chat
            </Button>
          </div>
        </div>
      </PageTransition>
    );
  }

  return (
    <PageTransition>
      <div className="min-h-screen bg-gradient-to-br from-indigo-900 via-purple-900 to-pink-900 flex items-center justify-center p-6">
        <Card className="w-full max-w-md bg-white/10 backdrop-blur-sm">
          <CardHeader>
            <CardTitle className="text-center text-white">
              {step === 1
                ? "Upload Your Chat Export 📱"
                : "Analyzing Your Chat 🔍"}
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-6">
            {error && (
              <div className="bg-red-500/10 border border-red-500/20 rounded-lg p-4 text-red-200">
                {error}
              </div>
            )}

            {step === 1 ? (
              <>
                <div className="relative">
                  <Input
                    type="file"
                    accept=".txt"
                    onChange={handleFileChange}
                    className="bg-white/5 border-white/10 text-white"
                  />
                  {uploadProgress > 0 && uploadProgress < 100 && (
                    <div
                      className="absolute bottom-0 left-0 h-1 bg-blue-500 transition-all duration-300"
                      style={{ width: `${uploadProgress}%` }}
                    />
                  )}
                </div>
                <Button
                  onClick={handleUpload}
                  className="w-full bg-white/10 hover:bg-white/20"
                  disabled={!file || loading}
                >
                  {loading ? (
                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white" />
                  ) : (
                    <>
                      <ArrowRight className="mr-2 h-4 w-4" />
                      Generate Your Chat Wrapped
                    </>
                  )}
                </Button>
              </>
            ) : (
              <div className="text-center space-y-4">
                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-white mx-auto" />
                <p className="text-white">Analyzing your conversations...</p>
                <p className="text-sm text-white/60">
                  This might take a moment
                </p>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </PageTransition>
  );
};

export default ChatAnalysisPage;
