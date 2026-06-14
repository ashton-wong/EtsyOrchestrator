export async function GET(_req: Request, { params }: { params: { id: string } }) {
  const { getRun } = await import("@etsy-orchestrator/backend/db/queries/runs");

  const encoder = new TextEncoder();
  let closed = false;

  const stream = new ReadableStream({
    async start(controller) {
      const send = (data: unknown) => {
        if (closed) return;
        controller.enqueue(encoder.encode(`data: ${JSON.stringify(data)}\n\n`));
      };

      // Poll DB every 2s and emit status changes
      let lastStatus = "";
      const interval = setInterval(async () => {
        try {
          const run = await getRun(params.id);
          if (!run) { clearInterval(interval); controller.close(); return; }
          if (run.status !== lastStatus) {
            lastStatus = run.status;
            send({ status: run.status, run });
          }
          if (["live", "rejected", "failed"].includes(run.status)) {
            clearInterval(interval);
            controller.close();
          }
        } catch { clearInterval(interval); controller.close(); }
      }, 2000);
    },
    cancel() { closed = true; },
  });

  return new Response(stream, {
    headers: {
      "Content-Type": "text/event-stream",
      "Cache-Control": "no-cache",
      "Connection": "keep-alive",
    },
  });
}
