import { NextRequest, NextResponse } from "next/server";

export const runtime = "nodejs";
export const maxDuration = 30;

export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData();
    const audioFile = formData.get("audio") as File | null;
    const model = formData.get("model") as string || "whisper-large-v3";

    if (!audioFile) {
      return NextResponse.json(
        { error: "No audio file provided" },
        { status: 400 }
      );
    }

    const groqApiKey = process.env.GROQ_API_KEY;

    if (!groqApiKey) {
      console.warn("GROQ_API_KEY not configured, transcription unavailable");
      return NextResponse.json(
        { error: "Speech-to-text service not configured" },
        { status: 503 }
      );
    }

    // Convert File to Buffer for Groq API
    const arrayBuffer = await audioFile.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);

    // Get language parameter (default to English)
    const language = formData.get("language") as string || "en";

    // Create FormData for Groq API
    const groqFormData = new FormData();
    const blob = new Blob([buffer], { type: audioFile.type });
    groqFormData.append("file", blob, "audio.webm");
    groqFormData.append("model", model);
    groqFormData.append("response_format", "json");
    groqFormData.append("language", language);

    // Enable timestamp for better formatting (optional)
    groqFormData.append("timestamp_granularities[]", "word");

    // Call Groq API
    const groqResponse = await fetch(
      "https://api.groq.com/openai/v1/audio/transcriptions",
      {
        method: "POST",
        headers: {
          Authorization: `Bearer ${groqApiKey}`,
        },
        body: groqFormData,
      }
    );

    if (!groqResponse.ok) {
      const errorText = await groqResponse.text();
      console.error("Groq API error:", errorText);
      return NextResponse.json(
        { error: "Transcription service error", details: errorText },
        { status: groqResponse.status }
      );
    }

    const transcriptionData = await groqResponse.json();

    return NextResponse.json({
      text: transcriptionData.text || "",
      model: model,
      duration: transcriptionData.duration || null,
    });
  } catch (error) {
    console.error("Transcription error:", error);
    return NextResponse.json(
      {
        error: "Internal transcription error",
        details: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 }
    );
  }
}
