var __defProp = Object.defineProperty;
var __name = (target, value) => __defProp(target, "name", { value, configurable: true });

// .wrangler/tmp/bundle-v2VSkc/checked-fetch.js
var urls = /* @__PURE__ */ new Set();
function checkURL(request, init) {
  const url = request instanceof URL ? request : new URL(
    (typeof request === "string" ? new Request(request, init) : request).url
  );
  if (url.port && url.port !== "443" && url.protocol === "https:") {
    if (!urls.has(url.toString())) {
      urls.add(url.toString());
      console.warn(
        `WARNING: known issue with \`fetch()\` requests to custom HTTPS ports in published Workers:
 - ${url.toString()} - the custom port will be ignored when the Worker is published using the \`wrangler deploy\` command.
`
      );
    }
  }
}
__name(checkURL, "checkURL");
globalThis.fetch = new Proxy(globalThis.fetch, {
  apply(target, thisArg, argArray) {
    const [request, init] = argArray;
    checkURL(request, init);
    return Reflect.apply(target, thisArg, argArray);
  }
});

// index.ts
var corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type"
};
var ACCOUNT_ID = "a0aea21f8b422b03ea28d79829060046";
var API_TOKEN = "cfut_WS2J372BIQpzpCiyTG3gChdyVWnSZ1mozJXp1lz6a754da42";
var index_default = {
  async fetch(request) {
    if (request.method === "OPTIONS") {
      return new Response(null, { headers: corsHeaders });
    }
    if (request.method === "GET") {
      return new Response(JSON.stringify({ status: "ok", worker: "analyze-artifact" }), {
        headers: { "Content-Type": "application/json", ...corsHeaders }
      });
    }
    if (request.method !== "POST") {
      return new Response(JSON.stringify({ error: "Method not allowed. Use POST." }), {
        status: 405,
        headers: { "Content-Type": "application/json", ...corsHeaders }
      });
    }
    try {
      const { image_urls, context, language } = await request.json();
      const languagePrompts = {
        en: "Respond in English.",
        nl: "Antwoord in het Nederlands.",
        de: "Antworten Sie auf Deutsch.",
        fr: "R\xE9pondez en fran\xE7ais.",
        es: "Responda en espa\xF1ol."
      };
      const depthFound = context?.depth_found;
      const soilType = context?.soil_type;
      const conditionVal = context?.condition;
      const detectionMethod = context?.detection_method;
      const material = context?.material;
      const materialContext = material ? `The user has confirmed this object is made from: ${material}. Use this as the definitive material.` : `Do NOT guess or assume the material if you are not highly certain. Leave material as empty string.`;
      const extraContext = [
        depthFound && `Depth found: ${depthFound}`,
        soilType && `Soil type: ${soilType}`,
        conditionVal && `Condition: ${conditionVal}`,
        detectionMethod && `Detection method: ${detectionMethod}`
      ].filter(Boolean).join("\n");
      const prompt = `You are an expert archaeologist analyzing an archaeological find. Look carefully at the image and identify what you see.

${extraContext ? `Context:
${extraContext}
` : ""}
${materialContext}

${languagePrompts[language || "en"]}

Search your knowledge for detailed information about this type of artifact. Include:
- Specific period with dates (e.g., "Roman Period, 1st-3rd century AD")
- Origin region or culture
- Historical context and use
- Similar documented finds in databases
- Reference links to databases like PAN (Portable Antiquities of the Netherlands - https://portable-antiquities.nl/pan/), Dutch archaeological databases, and other relevant sources

Return ONLY valid JSON in this exact format (no extra text):
{
    "identification": {
        "name": "specific name of the artifact type",
        "period": "specific period with dates",
        "origin": "specific region/culture",
        "material": "material it is made of",
        "description": {
            "en": "5-6 detailed sentences about what it is, its historical context, typical use, how it was made, and significance",
            "nl": "5-6 zinnen in het Nederlands",
            "de": "5-6 S\xE4tze auf Deutsch",
            "fr": "5-6 phrases en fran\xE7ais",
            "es": "5-6 oraciones en espa\xF1ol"
        },
        "confidence": 85,
        "rarity": "common/uncommon/rare/very_rare",
        "similar_finds": "2-3 sentences about documented similar finds from archaeological databases",
        "reference_links": ["https://portable-antiquities.nl/pan/", "https:// DDS", "relevant database URLs"]
    },
    "storage_instructions": {
        "en": "3 sentences about proper handling, cleaning, and storage requirements",
        "nl": "3 zinnen in het Nederlands",
        "de": "3 S\xE4tze auf Deutsch",
        "fr": "3 phrases en fran\xE7ais",
        "es": "3 oraciones en espa\xF1ol"
    },
    "is_coin": false,
    "is_pipe": false,
    "is_archaeological": true
}`;
      let imageDebug = { received: false, url: "", size: 0 };
      let base64Image = "";
      if (image_urls && image_urls.length > 0) {
        try {
          const imgRes = await fetch(image_urls[0]);
          const blob = await imgRes.arrayBuffer();
          const uint8 = new Uint8Array(blob);
          let binary = "";
          for (let i = 0; i < uint8.length; i++) {
            binary += String.fromCharCode(uint8[i]);
          }
          base64Image = btoa(binary);
          imageDebug = { received: true, url: image_urls[0], size: uint8.length };
        } catch (e) {
          imageDebug = { received: false, url: image_urls[0], size: 0 };
        }
      }
      await fetch(
        `https://api.cloudflare.com/client/v4/accounts/${ACCOUNT_ID}/ai/run/@cf/meta/llama-3.2-11b-vision-instruct`,
        {
          method: "POST",
          headers: {
            "Authorization": `Bearer ${API_TOKEN}`,
            "Content-Type": "application/json"
          },
          body: JSON.stringify({ prompt: "agree" })
        }
      );
      const aiResponse = await fetch(
        `https://api.cloudflare.com/client/v4/accounts/${ACCOUNT_ID}/ai/run/@cf/meta/llama-3.2-11b-vision-instruct`,
        {
          method: "POST",
          headers: {
            "Authorization": `Bearer ${API_TOKEN}`,
            "Content-Type": "application/json"
          },
          body: JSON.stringify({
            messages: [
              {
                role: "user",
                content: [
                  { type: "text", text: prompt },
                  { type: "image_url", image_url: { url: `data:image/jpeg;base64,${base64Image}` } }
                ]
              }
            ],
            max_tokens: 4096
          })
        }
      );
      const aiData = await aiResponse.json();
      let result = aiData.result?.response || "";
      if (!result) {
        return new Response(JSON.stringify({ error: "AI returned empty response" }), {
          status: 500,
          headers: { "Content-Type": "application/json", ...corsHeaders }
        });
      }
      let parsed = null;
      try {
        parsed = JSON.parse(result);
      } catch {
        const jsonMatch = result.match(/```json\n?([\s\S]*?)\n?```|(\{[\s\S]*\})/);
        if (jsonMatch) {
          try {
            parsed = JSON.parse(jsonMatch[1] || jsonMatch[2]);
          } catch {
          }
        }
      }
      if (!parsed) {
        return new Response(JSON.stringify({ error: "Failed to parse AI response", raw: result.substring(0, 200) }), {
          status: 500,
          headers: { "Content-Type": "application/json", ...corsHeaders }
        });
      }
      return new Response(JSON.stringify(parsed), {
        headers: { "Content-Type": "application/json", ...corsHeaders }
      });
    } catch (error) {
      return new Response(JSON.stringify({ error: String(error) }), {
        status: 500,
        headers: { "Content-Type": "application/json", ...corsHeaders }
      });
    }
  }
};

// ../../../../../AppData/Local/npm-cache/_npx/32026684e21afda6/node_modules/wrangler/templates/middleware/middleware-ensure-req-body-drained.ts
var drainBody = /* @__PURE__ */ __name(async (request, env, _ctx, middlewareCtx) => {
  try {
    return await middlewareCtx.next(request, env);
  } finally {
    try {
      if (request.body !== null && !request.bodyUsed) {
        const reader = request.body.getReader();
        while (!(await reader.read()).done) {
        }
      }
    } catch (e) {
      console.error("Failed to drain the unused request body.", e);
    }
  }
}, "drainBody");
var middleware_ensure_req_body_drained_default = drainBody;

// ../../../../../AppData/Local/npm-cache/_npx/32026684e21afda6/node_modules/wrangler/templates/middleware/middleware-miniflare3-json-error.ts
function reduceError(e) {
  return {
    name: e?.name,
    message: e?.message ?? String(e),
    stack: e?.stack,
    cause: e?.cause === void 0 ? void 0 : reduceError(e.cause)
  };
}
__name(reduceError, "reduceError");
var jsonError = /* @__PURE__ */ __name(async (request, env, _ctx, middlewareCtx) => {
  try {
    return await middlewareCtx.next(request, env);
  } catch (e) {
    const error = reduceError(e);
    return Response.json(error, {
      status: 500,
      headers: { "MF-Experimental-Error-Stack": "true" }
    });
  }
}, "jsonError");
var middleware_miniflare3_json_error_default = jsonError;

// .wrangler/tmp/bundle-v2VSkc/middleware-insertion-facade.js
var __INTERNAL_WRANGLER_MIDDLEWARE__ = [
  middleware_ensure_req_body_drained_default,
  middleware_miniflare3_json_error_default
];
var middleware_insertion_facade_default = index_default;

// ../../../../../AppData/Local/npm-cache/_npx/32026684e21afda6/node_modules/wrangler/templates/middleware/common.ts
var __facade_middleware__ = [];
function __facade_register__(...args) {
  __facade_middleware__.push(...args.flat());
}
__name(__facade_register__, "__facade_register__");
function __facade_invokeChain__(request, env, ctx, dispatch, middlewareChain) {
  const [head, ...tail] = middlewareChain;
  const middlewareCtx = {
    dispatch,
    next(newRequest, newEnv) {
      return __facade_invokeChain__(newRequest, newEnv, ctx, dispatch, tail);
    }
  };
  return head(request, env, ctx, middlewareCtx);
}
__name(__facade_invokeChain__, "__facade_invokeChain__");
function __facade_invoke__(request, env, ctx, dispatch, finalMiddleware) {
  return __facade_invokeChain__(request, env, ctx, dispatch, [
    ...__facade_middleware__,
    finalMiddleware
  ]);
}
__name(__facade_invoke__, "__facade_invoke__");

// .wrangler/tmp/bundle-v2VSkc/middleware-loader.entry.ts
var __Facade_ScheduledController__ = class ___Facade_ScheduledController__ {
  constructor(scheduledTime, cron, noRetry) {
    this.scheduledTime = scheduledTime;
    this.cron = cron;
    this.#noRetry = noRetry;
  }
  static {
    __name(this, "__Facade_ScheduledController__");
  }
  #noRetry;
  noRetry() {
    if (!(this instanceof ___Facade_ScheduledController__)) {
      throw new TypeError("Illegal invocation");
    }
    this.#noRetry();
  }
};
function wrapExportedHandler(worker) {
  if (__INTERNAL_WRANGLER_MIDDLEWARE__ === void 0 || __INTERNAL_WRANGLER_MIDDLEWARE__.length === 0) {
    return worker;
  }
  for (const middleware of __INTERNAL_WRANGLER_MIDDLEWARE__) {
    __facade_register__(middleware);
  }
  const fetchDispatcher = /* @__PURE__ */ __name(function(request, env, ctx) {
    if (worker.fetch === void 0) {
      throw new Error("Handler does not export a fetch() function.");
    }
    return worker.fetch(request, env, ctx);
  }, "fetchDispatcher");
  return {
    ...worker,
    fetch(request, env, ctx) {
      const dispatcher = /* @__PURE__ */ __name(function(type, init) {
        if (type === "scheduled" && worker.scheduled !== void 0) {
          const controller = new __Facade_ScheduledController__(
            Date.now(),
            init.cron ?? "",
            () => {
            }
          );
          return worker.scheduled(controller, env, ctx);
        }
      }, "dispatcher");
      return __facade_invoke__(request, env, ctx, dispatcher, fetchDispatcher);
    }
  };
}
__name(wrapExportedHandler, "wrapExportedHandler");
function wrapWorkerEntrypoint(klass) {
  if (__INTERNAL_WRANGLER_MIDDLEWARE__ === void 0 || __INTERNAL_WRANGLER_MIDDLEWARE__.length === 0) {
    return klass;
  }
  for (const middleware of __INTERNAL_WRANGLER_MIDDLEWARE__) {
    __facade_register__(middleware);
  }
  return class extends klass {
    #fetchDispatcher = /* @__PURE__ */ __name((request, env, ctx) => {
      this.env = env;
      this.ctx = ctx;
      if (super.fetch === void 0) {
        throw new Error("Entrypoint class does not define a fetch() function.");
      }
      return super.fetch(request);
    }, "#fetchDispatcher");
    #dispatcher = /* @__PURE__ */ __name((type, init) => {
      if (type === "scheduled" && super.scheduled !== void 0) {
        const controller = new __Facade_ScheduledController__(
          Date.now(),
          init.cron ?? "",
          () => {
          }
        );
        return super.scheduled(controller);
      }
    }, "#dispatcher");
    fetch(request) {
      return __facade_invoke__(
        request,
        this.env,
        this.ctx,
        this.#dispatcher,
        this.#fetchDispatcher
      );
    }
  };
}
__name(wrapWorkerEntrypoint, "wrapWorkerEntrypoint");
var WRAPPED_ENTRY;
if (typeof middleware_insertion_facade_default === "object") {
  WRAPPED_ENTRY = wrapExportedHandler(middleware_insertion_facade_default);
} else if (typeof middleware_insertion_facade_default === "function") {
  WRAPPED_ENTRY = wrapWorkerEntrypoint(middleware_insertion_facade_default);
}
var middleware_loader_entry_default = WRAPPED_ENTRY;
export {
  __INTERNAL_WRANGLER_MIDDLEWARE__,
  middleware_loader_entry_default as default
};
//# sourceMappingURL=index.js.map
