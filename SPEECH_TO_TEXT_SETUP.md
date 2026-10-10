# Speech-to-Text Setup Guide

This guide will help you set up the AI-powered speech-to-text feature for the Lost & Found report form.

## 🎙️ Feature Overview

The speech-to-text feature allows users to report lost and found items using their voice instead of typing. This makes reporting faster, more convenient, and accessible.

### Technology Stack
- **Primary**: Groq Cloud API (Whisper Large v3) - High accuracy, fast transcription
- **Fallback**: Web Speech API - Browser-based, works when Groq API is unavailable

## 📋 Prerequisites

1. A Groq Cloud account (free tier available)
2. Node.js environment with Next.js
3. Microphone access in the browser

## 🚀 Setup Instructions

### Step 1: Get Your Groq API Key

1. Go to [Groq Console](https://console.groq.com/)
2. Sign up or log in to your account
3. Navigate to **API Keys** section
4. Click **"Create API Key"**
5. Copy your API key (it starts with `gsk_...`)

### Step 2: Configure Environment Variables

1. Open your `.env.local` file (create one if it doesn't exist)
2. Add the following line:

```bash
GROQ_API_KEY=gsk_your_actual_api_key_here
```

3. Save the file

**Important**: Never commit your `.env.local` file to version control. It's already in `.gitignore`.

### Step 3: Install Dependencies (Already Done)

The required dependencies are already in `package.json`:
- `next` - For API routes
- Built-in Web APIs - No additional packages needed

### Step 4: Restart Development Server

```bash
npm run dev
```

## 🎯 How It Works

### For Users:

1. Navigate to the **Report Item** page
2. Find the **Item Name** or **Description** field
3. Click the **microphone icon** 🎤
4. Allow microphone access when prompted
5. Start speaking clearly
6. Click the **stop button** when done
7. The transcribed text appears in the field
8. Edit if needed and submit

### Technical Flow:

```
User clicks mic → Browser requests mic access
                ↓
          Records audio
                ↓
    Sends to Groq API (Primary)
                ↓
    ┌───────────┴───────────┐
    ↓                       ↓
Success: Transcribes    Fails: Falls back to
with Whisper v3         Web Speech API
    ↓                       ↓
    └───────────┬───────────┘
                ↓
        Text appears in form
```

## 🔧 Features

### Voice Input Component (`VoiceInput.tsx`)

- **Real-time feedback**: Visual indicators during recording and processing
- **Dual-mode transcription**: Groq API with Web Speech API fallback
- **Error handling**: Clear error messages if something goes wrong
- **Seamless integration**: Works with both single-line and multi-line text fields
- **Character limits**: Respects `maxLength` property
- **Append mode**: Adds new transcriptions to existing text

### API Route (`/api/transcribe`)

- **Secure**: API key stored server-side only
- **Fast**: Typical response time: 1-3 seconds
- **Robust**: Comprehensive error handling
- **Format support**: WebM, MP4 audio formats
- **Language**: English (can be extended to 99+ languages)

## 📊 API Limits

### Groq Cloud (Free Tier)
- **Rate Limit**: Generous requests per minute
- **Model**: Whisper Large v3
- **Accuracy**: 6-8% Word Error Rate (industry-leading)
- **Speed**: 100-300ms latency
- **Cost**: Free with rate limits

### Web Speech API (Fallback)
- **Rate Limit**: Unlimited (browser-based)
- **Accuracy**: Good (8-12% WER)
- **Speed**: Real-time
- **Cost**: Free
- **Limitation**: Chrome/Edge/Safari only

## 🐛 Troubleshooting

### Issue: "Speech-to-text service not configured"
**Solution**: 
- Ensure `GROQ_API_KEY` is set in `.env.local`
- Restart the development server
- Check that the key starts with `gsk_`

### Issue: "Microphone access denied"
**Solution**:
- Click the lock icon in browser address bar
- Allow microphone permissions
- Refresh the page

### Issue: "No speech detected"
**Solution**:
- Speak louder and more clearly
- Check microphone is working (test in other apps)
- Reduce background noise
- Try getting closer to the microphone

### Issue: Transcription is inaccurate
**Solution**:
- Speak more slowly and clearly
- Use the fallback Web Speech API for real-time corrections
- Edit the transcribed text manually
- Report technical terms or uncommon words by typing

### Issue: "Transcription failed"
**Solution**:
- Check internet connection
- Verify Groq API key is valid
- Check Groq API status: [https://status.groq.com/](https://status.groq.com/)
- System will automatically fall back to Web Speech API

## 🔒 Security & Privacy

- **Audio data**: Sent to Groq API for transcription, not stored
- **API key**: Stored server-side only, never exposed to client
- **Microphone**: Only accessed when user clicks the mic button
- **Data retention**: Groq does not store audio after transcription
- **HTTPS**: All API calls are encrypted

## 🌐 Browser Support

### Full Support (Groq + Web Speech):
- ✅ Chrome 80+ (Desktop & Mobile)
- ✅ Edge 80+
- ✅ Safari 14.1+
- ✅ Opera 67+

### Partial Support (Groq only):
- ✅ Firefox (Web Speech API not supported, Groq API works)
- ✅ Other modern browsers

## 📈 Future Enhancements

Potential improvements:
- [ ] Support for multiple languages (Hindi, etc.)
- [ ] Real-time transcription display
- [ ] Voice commands (e.g., "delete", "new line")
- [ ] Offline mode with local Whisper
- [ ] Speaker diarization for multi-person reports
- [ ] Punctuation and formatting improvements

## 📞 Support

If you encounter issues:
1. Check this documentation
2. Review browser console for errors
3. Test microphone in other applications
4. Verify Groq API key is correct
5. Contact support or create an issue

## 🎓 Resources

- [Groq Documentation](https://console.groq.com/docs)
- [Whisper Model Info](https://github.com/openai/whisper)
- [Web Speech API Docs](https://developer.mozilla.org/en-US/docs/Web/API/Web_Speech_API)

---

**Last Updated**: September 10, 2026
**Version**: 1.0.0
