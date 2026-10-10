"use client";

import { useState, useRef, useEffect } from "react";

interface VoiceInputProps {
  value: string;
  onChange: (text: string) => void;
  placeholder?: string;
  fieldName?: string;
  className?: string;
  maxLength?: number;
  multiline?: boolean;
  rows?: number;
}

// Language options for speech recognition
const LANGUAGES = [
  { code: "en-US", label: "English", flag: "EN", emoji: "🇺🇸" },
  { code: "hi-IN", label: "हिंदी", flag: "HI", emoji: "🇮🇳" },
  { code: "bn-IN", label: "বাংলা", flag: "BN", emoji: "🇮🇳" },
  { code: "te-IN", label: "తెలుగు", flag: "TE", emoji: "🇮🇳" },
  { code: "ta-IN", label: "தமிழ்", flag: "TA", emoji: "🇮🇳" },
  { code: "mr-IN", label: "मराठी", flag: "MR", emoji: "🇮🇳" },
  { code: "gu-IN", label: "ગુજરાતી", flag: "GU", emoji: "🇮🇳" },
  { code: "kn-IN", label: "ಕನ್ನಡ", flag: "KN", emoji: "🇮🇳" },
  { code: "ml-IN", label: "മലയാളം", flag: "ML", emoji: "🇮🇳" },
  { code: "pa-IN", label: "ਪੰਜਾਬੀ", flag: "PA", emoji: "🇮🇳" },
];

export default function VoiceInput({
  value,
  onChange,
  placeholder = "Type or click the mic to speak...",
  fieldName = "text",
  className = "",
  maxLength,
  multiline = false,
  rows = 3,
}: VoiceInputProps) {
  console.log('VoiceInput Debug: Component Rendered', new Date().toISOString());

  const [isRecording, setIsRecording] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [transcriptionMethod, setTranscriptionMethod] = useState<"groq" | "webspeech" | null>(null);
  const [selectedLanguage, setSelectedLanguage] = useState("en-US");
  const [showLanguageDropdown, setShowLanguageDropdown] = useState(false);
  const [realtimeTranscript, setRealtimeTranscript] = useState("");
  const [showRealtimeTranscript, setShowRealtimeTranscript] = useState(false);

  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);
  const recognitionRef = useRef<any>(null);
  const dropdownRef = useRef<HTMLDivElement>(null);

  // Initialize Web Speech API with real-time support
  useEffect(() => {
    if (typeof window !== "undefined") {
      const SpeechRecognition =
        (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;

      if (SpeechRecognition) {
        recognitionRef.current = new SpeechRecognition();
        recognitionRef.current.continuous = true; // Enable continuous recognition
        recognitionRef.current.interimResults = true; // Enable interim results for real-time
        recognitionRef.current.lang = selectedLanguage;
      }
    }
  }, [selectedLanguage]);

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setShowLanguageDropdown(false);
      }
    };

    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  // Smart punctuation and formatting
  const formatTranscript = (text: string): string => {
    if (!text) return text;

    let formatted = text.trim();

    // Capitalize first letter
    formatted = formatted.charAt(0).toUpperCase() + formatted.slice(1);

    // Add period at the end if missing
    if (!/[.!?]$/.test(formatted)) {
      formatted += ".";
    }

    // Capitalize after punctuation
    formatted = formatted.replace(/([.!?]\s+)([a-z])/g, (match, p1, p2) => {
      return p1 + p2.toUpperCase();
    });

    // Common abbreviations that should be uppercase
    const abbreviations = ["id", "abes", "usb", "wifi", "atm", "sim"];
    abbreviations.forEach((abbr) => {
      const regex = new RegExp(`\\b${abbr}\\b`, "gi");
      formatted = formatted.replace(regex, abbr.toUpperCase());
    });

    // Handle common phrases
    formatted = formatted.replace(/\bi found\b/gi, "I found");
    formatted = formatted.replace(/\bi lost\b/gi, "I lost");
    formatted = formatted.replace(/\bim\b/gi, "I'm");

    return formatted;
  };

  const startRecording = async () => {
    setError(null);
    setIsRecording(true);
    setRealtimeTranscript("");
    setShowRealtimeTranscript(false);
    audioChunksRef.current = [];

    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });

      // Try to use Groq API (via MediaRecorder for audio capture)
      const mimeType = MediaRecorder.isTypeSupported("audio/webm")
        ? "audio/webm"
        : "audio/mp4";

      const mediaRecorder = new MediaRecorder(stream, { mimeType });
      mediaRecorderRef.current = mediaRecorder;

      mediaRecorder.ondataavailable = (event) => {
        if (event.data.size > 0) {
          audioChunksRef.current.push(event.data);
        }
      };

      mediaRecorder.onstop = async () => {
        stream.getTracks().forEach((track) => track.stop());

        const audioBlob = new Blob(audioChunksRef.current, { type: mimeType });

        // Try Groq API first
        await transcribeWithGroq(audioBlob);
      };

      mediaRecorder.start();
      setTranscriptionMethod("groq");
      setShowRealtimeTranscript(true);
    } catch (err) {
      console.error("MediaRecorder error, falling back to Web Speech API:", err);

      // Fallback to Web Speech API
      if (recognitionRef.current) {
        setTranscriptionMethod("webspeech");
        setShowRealtimeTranscript(true);
        startWebSpeechRecognition();
      } else {
        setError("Microphone access denied or not supported.");
        setIsRecording(false);
      }
    }
  };

  const stopRecording = () => {
    setShowRealtimeTranscript(false);
    setRealtimeTranscript("");

    if (mediaRecorderRef.current && mediaRecorderRef.current.state !== "inactive") {
      mediaRecorderRef.current.stop();
      setIsRecording(false);
    } else if (recognitionRef.current && transcriptionMethod === "webspeech") {
      recognitionRef.current.stop();
      setIsRecording(false);
    }
  };

  const startWebSpeechRecognition = () => {
    if (!recognitionRef.current) {
      setError("Speech recognition not supported in this browser.");
      setIsRecording(false);
      return;
    }

    let finalTranscript = "";

    recognitionRef.current.onresult = (event: any) => {
      let interimTranscript = "";

      for (let i = event.resultIndex; i < event.results.length; i++) {
        const transcript = event.results[i][0].transcript;
        if (event.results[i].isFinal) {
          finalTranscript += transcript + " ";
        } else {
          interimTranscript += transcript;
        }
      }

      // Show real-time interim results
      setRealtimeTranscript(interimTranscript || finalTranscript);
    };

    recognitionRef.current.onend = () => {
      if (finalTranscript.trim()) {
        const formattedText = formatTranscript(finalTranscript);
        const currentText = value ? `${value} ${formattedText}` : formattedText;
        const finalText = maxLength ? currentText.slice(0, maxLength) : currentText;
        onChange(finalText);
      }
      setIsRecording(false);
      setShowRealtimeTranscript(false);
      setRealtimeTranscript("");
    };

    recognitionRef.current.onerror = (event: any) => {
      setError(`Speech recognition error: ${event.error}`);
      setIsRecording(false);
      setShowRealtimeTranscript(false);
    };

    recognitionRef.current.lang = selectedLanguage;
    recognitionRef.current.start();
  };

  const transcribeWithGroq = async (audioBlob: Blob) => {
    setIsProcessing(true);

    try {
      const formData = new FormData();
      formData.append("audio", audioBlob, "recording.webm");
      formData.append("model", "whisper-large-v3");
      formData.append("language", selectedLanguage.split("-")[0]); // Extract language code (e.g., "en" from "en-US")

      const response = await fetch("/api/transcribe", {
        method: "POST",
        body: formData,
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || "Transcription failed");
      }

      const data = await response.json();
      const transcript = data.text || "";

      if (transcript.trim()) {
        const formattedText = formatTranscript(transcript);
        const currentText = value ? `${value} ${formattedText}` : formattedText;
        const finalText = maxLength ? currentText.slice(0, maxLength) : currentText;
        onChange(finalText);
      } else {
        setError("No speech detected. Please try again.");
      }
    } catch (err) {
      console.error("Groq API transcription error:", err);
      setError("Transcription failed. Please try typing instead.");

      // If Groq fails, offer to retry with Web Speech API
      if (recognitionRef.current) {
        console.log("Falling back to Web Speech API");
      }
    } finally {
      setIsProcessing(false);
    }
  };

  const handleToggleRecording = () => {
    if (isRecording) {
      stopRecording();
    } else {
      startRecording();
    }
  };

  const handleLanguageChange = (langCode: string) => {
    setSelectedLanguage(langCode);
    setShowLanguageDropdown(false);
    if (recognitionRef.current) {
      recognitionRef.current.lang = langCode;
    }
  };

  const InputComponent = multiline ? "textarea" : "input";
  const inputProps = multiline ? { rows } : { type: "text" };

  const selectedLang = LANGUAGES.find((lang) => lang.code === selectedLanguage) || LANGUAGES[0];

  return (
    <div className="relative" style={{ isolation: 'isolate' }}>
      <div className="relative">
        <InputComponent
          value={value}
          onChange={(e) => onChange(e.target.value)}
          placeholder={placeholder}
          maxLength={maxLength}
          className={`w-full rounded-xl border border-[#E8E6E1] bg-[#FAFAF8] px-3.5 py-2.5 pr-24 text-xs text-[#171717] placeholder-[#6B6B67] focus:border-[#7A1F2B] focus:bg-white focus:outline-none focus:ring-2 focus:ring-[#7A1F2B]/15 ${className}`}
          {...inputProps}
        />

        {/* Controls Container */}
        <div className="absolute right-2 top-1/2 -translate-y-1/2 flex items-center gap-1" style={{ zIndex: 50 }}>
          {/* Language Selector */}
          <div className="relative" ref={dropdownRef}>
            <button
              type="button"
              onClick={() => {
                console.log('Language button clicked, dropdown state:', !showLanguageDropdown);
                setShowLanguageDropdown(!showLanguageDropdown);
              }}
              className="rounded-lg px-2.5 py-1.5 text-xs font-semibold transition-all duration-200 bg-[#FAFAF8] border border-[#E8E6E1] hover:border-[#7A1F2B] hover:bg-white"
              title={`Selected: ${selectedLang.label}`}
            >
              <span className="flex items-center gap-1">
                <span className="text-sm">{selectedLang.emoji}</span>
                <span>{selectedLang.flag}</span>
              </span>
            </button>

            {showLanguageDropdown && (
              <div
                className="absolute right-0 top-full mt-2 w-48 rounded-xl border border-[#E8E6E1] bg-white shadow-2xl animate-dropdown max-h-72 overflow-y-auto"
                style={{ zIndex: 99999, position: 'fixed' }}
              >
                {LANGUAGES.map((lang) => (
                  <button
                    key={lang.code}
                    type="button"
                    onClick={() => handleLanguageChange(lang.code)}
                    className={`w-full flex items-center gap-2.5 px-3.5 py-2.5 text-xs text-left transition hover:bg-[#FAFAF8] first:rounded-t-xl last:rounded-b-xl ${
                      selectedLanguage === lang.code ? "bg-[#F6EDEF] text-[#7A1F2B] font-semibold" : "text-[#171717]"
                    }`}
                  >
                    <span className="text-sm">{lang.emoji}</span>
                    <span className="font-medium">{lang.flag}</span>
                    <span>{lang.label}</span>
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* Voice Input Button */}
          <button
            type="button"
            onClick={handleToggleRecording}
            disabled={isProcessing}
            className={`rounded-lg p-2 transition-all duration-200 ${
              isRecording
                ? "bg-red-500 text-white animate-pulse shadow-lg"
                : isProcessing
                ? "bg-[#6B6B67] text-white opacity-50"
                : "bg-[#7A1F2B] text-white hover:bg-[#631822] hover:scale-110"
            }`}
            title={isRecording ? "Stop recording" : "Start voice input"}
          >
            {isProcessing ? (
              <svg className="h-4 w-4 animate-spin" fill="none" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z" />
              </svg>
            ) : isRecording ? (
              <svg className="h-4 w-4" fill="currentColor" viewBox="0 0 24 24">
                <rect x="6" y="6" width="12" height="12" rx="2" />
              </svg>
            ) : (
              <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  d="M12 18.75a6 6 0 006-6v-1.5m-6 7.5a6 6 0 01-6-6v-1.5m6 7.5v3.75m-3.75 0h7.5M12 15.75a3 3 0 01-3-3V4.5a3 3 0 116 0v8.25a3 3 0 01-3 3z"
                />
              </svg>
            )}
          </button>
        </div>
      </div>

      {/* Real-time Transcription Display */}
      {showRealtimeTranscript && realtimeTranscript && (
        <div className="mt-2 rounded-lg border border-blue-200 bg-blue-50 px-3 py-2 text-xs">
          <div className="flex items-start gap-2">
            <span className="text-blue-600 font-semibold shrink-0">Live:</span>
            <span className="text-blue-800 italic">{realtimeTranscript}</span>
          </div>
        </div>
      )}

      {/* Status Messages */}
      {isRecording && !showRealtimeTranscript && (
        <div className="mt-2 flex items-center gap-2 text-xs">
          <span className="relative flex h-2 w-2">
            <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-red-400 opacity-75"></span>
            <span className="relative inline-flex h-2 w-2 rounded-full bg-red-500"></span>
          </span>
          <span className="font-medium text-red-600">
            Recording in {selectedLang.label}... {transcriptionMethod === "groq" && "(High accuracy mode)"}
          </span>
        </div>
      )}

      {isProcessing && (
        <div className="mt-2 text-xs font-medium text-[#7A1F2B] animate-pulse">
          🎙️ Transcribing and formatting your speech...
        </div>
      )}

      {error && (
        <div className="mt-2 rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-xs font-medium text-red-600">
          {error}
        </div>
      )}

      {/* Info hint */}
      {!isRecording && !isProcessing && !error && (
        <p className="mt-1.5 text-[10px] text-[#6B6B67]">
          💡 Click {selectedLang.flag} to change language • Click 🎤 for AI-powered voice input with auto-formatting
        </p>
      )}
    </div>
  );
}
