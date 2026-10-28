"""
Appwrite Function Entrypoint: analyse
Receives JSON payload, executes pure Python engine, and returns StatResult JSON.
Zero data stored on server; lightweight, stateless, and high-performance.
"""

import json
from engine import analyse


def main(context):
    """
    Appwrite Function handler.
    context.req: request object containing headers, body, body_json, etc.
    context.res: response helper (json, text, empty, etc.)
    context.log: logger for stdout
    context.error: logger for stderr
    """
    try:
        # Appwrite passes body either as parsed body_json or raw string in body
        payload = None
        if hasattr(context.req, "body_json") and context.req.body_json:
            payload = context.req.body_json
        elif hasattr(context.req, "body") and context.req.body:
            if isinstance(context.req.body, dict):
                payload = context.req.body
            else:
                payload = json.loads(context.req.body)
        else:
            payload = {}

        if not payload:
            return context.res.json({"verdict": "invalid", "error": "Empty request payload provided"}, 400)

        # Run statistical analysis
        result = analyse(payload)
        return context.res.json(result, 200)

    except ValueError as e:
        return context.res.json({"verdict": "invalid", "error": str(e)}, 400)
    except Exception as e:
        if hasattr(context, "error"):
            context.error(f"Analysis engine exception: {str(e)}")
        return context.res.json({"verdict": "invalid", "error": f"Internal engine error: {str(e)}"}, 500)
