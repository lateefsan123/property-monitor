import "jsr:@supabase/functions-js/edge-runtime.d.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const SYSTEM_PROMPT = `You are an OCR assistant that extracts tabular data from screenshots of spreadsheets.

Rules:
- Read the column headers from the first visible row of the table.
- Read every data row you can see. Do not invent rows, do not skip rows.
- Preserve values EXACTLY as written, including leading zeros in phone numbers and unit numbers. Keep them as strings.
- If a cell appears empty or shows only "0", output an empty string for that cell.
- Use null only when a cell is truly unreadable.
- Keep column order consistent with the headers.

Return ONLY valid JSON with this exact shape:
{
  "headers": ["Header1", "Header2", ...],
  "rows": [
    ["value1", "value2", ...],
    ...
  ]
}
Each row array MUST have the same length as headers.`;

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const openaiKey = Deno.env.get("OPENAI_API_KEY");
    if (!openaiKey) {
      return new Response(JSON.stringify({ error: "OPENAI_API_KEY not configured" }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const { images } = await req.json();

    if (!Array.isArray(images) || images.length === 0) {
      return new Response(JSON.stringify({ error: "No images provided" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const imageParts = images.map((dataUrl: string) => ({
      type: "image_url",
      image_url: { url: dataUrl, detail: "high" },
    }));

    const response = await fetch("https://api.openai.com/v1/chat/completions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${openaiKey}`,
      },
      body: JSON.stringify({
        model: "gpt-4o",
        temperature: 0,
        response_format: { type: "json_object" },
        messages: [
          { role: "system", content: SYSTEM_PROMPT },
          {
            role: "user",
            content: [
              {
                type: "text",
                text: `Extract every row from the attached ${images.length === 1 ? "screenshot" : `${images.length} screenshots (in order)`} into the JSON format described. If multiple screenshots share the same headers, merge them into one table.`,
              },
              ...imageParts,
            ],
          },
        ],
      }),
    });

    if (!response.ok) {
      const text = await response.text();
      return new Response(JSON.stringify({ error: `OpenAI error: ${text.slice(0, 400)}` }), {
        status: 502,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const data = await response.json();
    const content = data.choices?.[0]?.message?.content?.trim();

    if (!content) {
      return new Response(JSON.stringify({ error: "Empty AI response" }), {
        status: 502,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    let parsed: { headers?: unknown; rows?: unknown };
    try {
      parsed = JSON.parse(content);
    } catch {
      const match = content.match(/\{[\s\S]*\}/);
      if (!match) {
        return new Response(JSON.stringify({ error: "Could not parse AI response" }), {
          status: 502,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      parsed = JSON.parse(match[0]);
    }

    const headers = Array.isArray(parsed.headers)
      ? parsed.headers.map((h) => String(h ?? ""))
      : [];
    const rawRows = Array.isArray(parsed.rows) ? parsed.rows : [];
    const rows = rawRows
      .filter((r): r is unknown[] => Array.isArray(r))
      .map((r) => {
        const row = r.map((c) => (c == null ? "" : String(c)));
        while (row.length < headers.length) row.push("");
        return row.slice(0, headers.length);
      });

    if (!headers.length) {
      return new Response(JSON.stringify({ error: "AI returned no headers" }), {
        status: 502,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    return new Response(JSON.stringify({ headers, rows }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (err) {
    return new Response(JSON.stringify({ error: (err as Error).message }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
