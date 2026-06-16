export async function GET(_req: Request, { params }: { params: { id: string } }) {
  const { getRun } = await import("@etsy-orchestrator/backend/db/queries/runs");

  const encoder = new TextEncoder();
  let interval: ReturnType<typeof setInterval> | undefined;
  let closed = false;

  const stream = new ReadableStream({
    async start(controller) {
      const stop = () => {
        if (closed) return;
        closed = true;
        if (interval) clearInterval(interval);
        try {
          controller.close();
        } catch {
          // already closed (e.g. client disconnected) — safe to ignore
        }
      };

      const send = (data: unknown) => {
        if (closed) return;
        try {
          controller.enqueue(encoder.encode(`data: ${JSON.stringify(data)}\n\n`));
        } catch {
          stop();
        }
      };

      // Poll DB every 2s and emit status changes
      let lastStatus = "";
      interval = setInterval(async () => {
        if (closed) return;
        try {
          const run = await getRun(params.id);
          if (!run) return stop();
          if (run.status !== lastStatus) {
            lastStatus = run.status;
            send({ status: run.status, run });
          }
          if (["live", "rejected", "failed"].includes(run.status)) stop();
        } catch {
          stop();
        }
      }, 2000);
    },
    // Client disconnected — stop polling so we never close an already-closed controller.
    cancel() {
      closed = true;
      if (interval) clearInterval(interval);
    },
  });

  return new Response(stream, {
    headers: {
      "Content-Type": "text/event-stream",
      "Cache-Control": "no-cache",
      "Connection": "keep-alive",
    },
  });
}
