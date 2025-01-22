// app/api/chat/route.ts

import { NextResponse } from 'next/server';
import OpenAI from "openai";

// Environment variables are available in the `process.env` object
console.log(process.env.API_KEY);
console.log(process.env.API_BASE_URL);

export async function POST(request: Request) {
  const openai = new OpenAI({
    baseURL: process.env.API_BASE_URL,
    apiKey: process.env.API_KEY,
  });

  try {
    const { messages } = await request.json();

    // Make the actual OpenAI call on the server
    const chatCompletion = await openai.chat.completions.create({
      model: "meta-llama/Llama-3.1-8B-Instruct",
      messages: messages,
    });
    
    console.log(chatCompletion);

    return NextResponse.json({ result: chatCompletion });
  } catch (error) {
    console.error('Error in /api/chat route:', error);
    return new NextResponse(
      JSON.stringify({ error: 'Something went wrong.' }),
      { status: 500 }
    );
  }
}
