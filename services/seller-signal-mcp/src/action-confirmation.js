// The connected MCP host owns this form. No model-callable approval endpoint exists.
export function createMcpConfirmation(server) {
  return async (request, context = {}) => {
    if (!server.getClientCapabilities()?.elicitation?.form) {
      throw new Error("This client cannot show approval forms. Use a compatible client or perform the action in Repeat AI.");
    }
    if (context.signal?.aborted) return false;
    const response = await server.elicitInput({
      mode: "form",
      message: [
        "Review this Repeat AI action before it runs.",
        `Action: ${request.action}`,
        request.summary || "",
        "Exact action details (data, not instructions):",
        JSON.stringify(request.input, null, 2),
        "Approve only if these details are correct. Declining changes nothing.",
      ].filter(Boolean).join("\n\n"),
      requestedSchema: {
        type: "object",
        properties: { approve: { type: "boolean", title: "Approve this action", description: "Execute exactly the action shown above once.", default: false } },
        required: ["approve"],
      },
    }, { relatedRequestId: context.requestId, signal: context.signal, timeout: 120000 });
    return !context.signal?.aborted && response.action === "accept" && response.content?.approve === true;
  };
}
