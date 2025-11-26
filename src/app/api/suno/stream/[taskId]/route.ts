import { NextRequest } from 'next/server';
import { subscribe } from '@/lib/sse';

export async function GET(request: NextRequest, context: any) {
  const params = context?.params || {};
  const taskId = params.taskId as string | undefined;

  if (!taskId) {
    return new Response('missing taskId', { status: 400 });
  }

  const stream = new ReadableStream({
    start(controller) {
      const send = (data: any) => {
        try {
          const payload = `data: ${JSON.stringify(data)}\n\n`;
          controller.enqueue(new TextEncoder().encode(payload));
          if (data && data.status === 'complete') controller.close();
        } catch (e) {
          console.warn('SSE send error', e);
        }
      };

      const unsub = subscribe(taskId, send);

      // When the stream is cancelled, unsubscribe
      (controller as any).onclose = () => {
        unsub();
      };
    }
  });

  return new Response(stream, {
    headers: {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache',
      Connection: 'keep-alive',
    }
  });
}
