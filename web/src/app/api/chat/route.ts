import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/auth";
import { streamText } from "ai";
import { anthropic } from "@ai-sdk/anthropic";
import { getOrCreateThread, addThreadItem } from "@/models/threads";
import { z } from "zod";

/**
 * Chat API Route - Handles streaming chat messages with project context
 * POST /api/chat
 */

const ChatRequestSchema = z.object({
  threadId: z.string().uuid().optional(),
  projectId: z.string(),
  specSlug: z.string().optional(),
  message: z.string().min(1),
});

export async function POST(req: NextRequest) {
  try {
    // Authenticate user
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Parse and validate request body
    const body = await req.json();
    const parsed = ChatRequestSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        { error: "Invalid request", details: parsed.error.issues },
        { status: 400 },
      );
    }

    const { threadId, projectId, specSlug, message } = parsed.data;

    // Get or create thread
    const scopeType = specSlug ? "spec" : "project";
    const scopeId = specSlug ? `${projectId}:${specSlug}` : projectId;

    const thread = threadId
      ? await getOrCreateThread({
          projectId,
          scopeType,
          scopeId,
        })
      : await getOrCreateThread({
          projectId,
          scopeType,
          scopeId,
          title: specSlug ? `${specSlug} chat` : "Project chat",
        });

    // Generate request ID for tracking
    const requestId = crypto.randomUUID();

    // Add user message to thread
    await addThreadItem({
      threadId: thread.id,
      role: "user",
      parts: [{ type: "text", content: message }],
      requestId,
    });

    // TODO: Load project context and tools in Phase 3
    // For now, use basic agent without tools

    // Stream response using AI SDK
    const result = streamText({
      model: anthropic("claude-3-5-sonnet-20241022"),
      messages: [
        {
          role: "system",
          content: `You are a helpful AI assistant for the Catalyst development platform. 
You are currently in ${scopeType === "spec" ? `the "${specSlug}" specification context` : "project context"}.
Project ID: ${projectId}

You can help users understand their project status, manage issues and pull requests, and coordinate work.`,
        },
        {
          role: "user",
          content: message,
        },
      ],
      temperature: 0.7,
    });

    // Convert to streaming response
    return result.toTextStreamResponse();
  } catch (error) {
    console.error("Chat API error:", error);
    return NextResponse.json(
      {
        error: "Internal server error",
        message:
          error instanceof Error ? error.message : "Unknown error occurred",
      },
      { status: 500 },
    );
  }
}
