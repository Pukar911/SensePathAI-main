export async function playCloudNaturalSpeech(text: string, apiKey: string) {
  try {
    const response = await fetch("https://api.openai.com/v1/audio/speech", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "tts-1",
        input: text,
        voice: "alloy", // Options include: alloy, echo, fable, onyx, nova, shimmer
        response_format: "mp3",
      }),
    });

    if (!response.ok) throw new Error("Failed to generate cloud speech");

    const blob = await response.blob();
    const audioUrl = URL.createObjectURL(blob);
    const audio = new Audio(audioUrl);
    await audio.play();
  } catch (error) {
    console.error("Cloud TTS playback error:", error);
  }
}