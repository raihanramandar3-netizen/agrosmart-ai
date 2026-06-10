
export interface DeepSeekMessage {
  role: 'user' | 'assistant' | 'system';
  content: string;
}

let deepSeekKey = process.env.DEEPSEEK_API_KEY || "";

export const setDeepSeekKey = (key: string) => {
  deepSeekKey = key;
};

export const chatWithDeepSeek = async (messages: DeepSeekMessage[]) => {
  if (!deepSeekKey) throw new Error("API Key DeepSeek belum diatur di Panel Admin.");

  try {
    const response = await fetch("https://api.deepseek.com/chat/completions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${deepSeekKey}`
      },
      body: JSON.stringify({
        model: "deepseek-chat",
        messages: messages,
        stream: false
      })
    });

    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(errorData.error?.message || "Gagal menghubungi server DeepSeek");
    }

    const data = await response.json();
    return data.choices[0].message.content;
  } catch (error: any) {
    console.error("DeepSeek Error:", error);
    throw error;
  }
};

export const validateDeepSeekKey = async (key: string) => {
  try {
    const response = await fetch("https://api.deepseek.com/chat/completions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${key}`
      },
      body: JSON.stringify({
        model: "deepseek-chat",
        messages: [{ role: "user", content: "hi" }],
        max_tokens: 1
      })
    });
    return response.ok;
  } catch {
    return false;
  }
};
