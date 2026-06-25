import { NextResponse } from 'next/server';
import { getSession } from '@/lib/session';
import { getMessages, createMessage } from '@/lib/db';

export const dynamic = 'force-dynamic';

export async function GET(request) {
  try {
    const session = await getSession();
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const recipientId = searchParams.get('recipientId');
    
    if (!recipientId) {
      return NextResponse.json({ error: 'Recipient ID is required' }, { status: 400 });
    }

    const chatHistory = await getMessages(session.id, recipientId);
    return NextResponse.json(chatHistory);
  } catch (error) {
    console.error("GET messages error:", error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}

export async function POST(request) {
  try {
    const session = await getSession();
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { receiverId, content } = await request.json();
    if (!receiverId || !content || !content.trim()) {
      return NextResponse.json({ error: 'Receiver ID and content are required' }, { status: 400 });
    }

    const newMsg = {
      id: `msg-${Math.random().toString(36).substring(2, 9)}`,
      senderId: session.id,
      receiverId,
      content: content.trim(),
      createdAt: new Date().toISOString()
    };

    const savedMsg = await createMessage(newMsg);
    return NextResponse.json(savedMsg);
  } catch (error) {
    console.error("POST message error:", error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}
