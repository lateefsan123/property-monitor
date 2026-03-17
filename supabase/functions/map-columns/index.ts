import "jsr:@supabase/functions-js/edge-runtime.d.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

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

    const { headers: sheetHeaders, sampleRows } = await req.json();

    if (!sheetHeaders?.length) {
      return new Response(JSON.stringify({ error: "No headers provided" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Build preview
    const preview = (sampleRows || []).slice(0, 5).map((row: string[]) => {
      const obj: Record<string, string> = {};
      sheetHeaders.forEach((h: string, i: number) => {
        obj[h] = row[i] ?? "";
      });
      return obj;
    });

    const response = await fetch("https://api.openai.com/v1/chat/completions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${openaiKey}`,
      },
      body: JSON.stringify({
        model: "gpt-4o-mini",
        temperature: 0,
        messages: [
          {
            role: "system",
            content: `You are a data mapping assistant for a real estate CRM. Given spreadsheet headers and sample data, map each header to one of these standard fields:

- name: The seller/owner/client name
- building: The building, tower, project, or community name
- bedroom: Number of bedrooms or unit type (studio, 1-bed, etc.)
- unit: Unit number or apartment number
- phone: Phone number, mobile, or WhatsApp number
- status: Lead status or pipeline stage (e.g. prospect, for sale, appraisal)
- lastContact: Last contact date, follow-up date, or any date column

Return ONLY valid JSON with this exact shape:
{"name":"Header Name","building":"Header Name","bedroom":"Header Name","unit":"Header Name","phone":"Header Name","status":"Header Name","lastContact":"Header Name"}

Use the EXACT header strings from the input. Use null for any field you cannot confidently match. Do not invent headers.`,
          },
          {
            role: "user",
            content: `Headers: ${JSON.stringify(sheetHeaders)}\n\nSample data:\n${JSON.stringify(preview, null, 2)}`,
          },
        ],
      }),
    });

    if (!response.ok) {
      const text = await response.text();
      return new Response(JSON.stringify({ error: `OpenAI error: ${text.slice(0, 200)}` }), {
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

    const jsonMatch = content.match(/\{[\s\S]*\}/);
    if (!jsonMatch) {
      return new Response(JSON.stringify({ error: "Could not parse AI response" }), {
        status: 502,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const mapping = JSON.parse(jsonMatch[0]);

    // Validate headers exist
    for (const key of Object.keys(mapping)) {
      if (mapping[key] && !sheetHeaders.includes(mapping[key])) {
        mapping[key] = null;
      }
    }

    return new Response(JSON.stringify({ mapping }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (err) {
    return new Response(JSON.stringify({ error: (err as Error).message }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
