"""AI sentiment analysis using Claude Sonnet 4.5 via emergentintegrations."""
import os
import json
from emergentintegrations.llm.chat import LlmChat, UserMessage


async def analyze_sentiment(symbol: str, price: float, change_24h_pct: float,
                            indicator_summary: dict) -> dict:
    """Return a sentiment score {sentiment, score, reasoning}."""
    key = os.environ.get("EMERGENT_LLM_KEY")
    if not key:
        return {"sentiment": "neutral", "score": 0, "reasoning": "LLM key not configured"}
    system = (
        "You are a quantitative crypto trading analyst. "
        "Given a symbol, latest price, 24h change %, and a JSON of technical indicators, "
        "respond with a compact JSON: {\"sentiment\":\"bullish|bearish|neutral\","
        "\"score\":-100..100,\"reasoning\":\"<=40 words\"}. "
        "Do NOT include markdown fences. Output only the raw JSON object."
    )
    chat = LlmChat(
        api_key=key,
        session_id=f"sentiment-{symbol}",
        system_message=system,
    ).with_model("anthropic", "claude-sonnet-4-5-20250929")

    prompt = (
        f"Symbol: {symbol}\nPrice: {price}\n24h change %: {change_24h_pct}\n"
        f"Indicators: {json.dumps(indicator_summary)}\n"
        "Return ONLY the JSON object."
    )
    try:
        raw = await chat.send_message(UserMessage(text=prompt))
        raw_str = str(raw).strip()
        # Strip accidental code fences
        if raw_str.startswith("```"):
            raw_str = raw_str.strip("`")
            if raw_str.lower().startswith("json"):
                raw_str = raw_str[4:].strip()
        data = json.loads(raw_str)
        return {
            "sentiment": data.get("sentiment", "neutral"),
            "score": int(data.get("score", 0)),
            "reasoning": data.get("reasoning", ""),
        }
    except Exception as exc:  # graceful degrade
        return {"sentiment": "neutral", "score": 0, "reasoning": f"AI degraded: {exc}"}
