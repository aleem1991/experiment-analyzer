"""
Local Development API Bridge for Experiment Analyzer
Uses Python's built-in http.server to provide an instant local endpoint on port 5000.
Requires ZERO extra dependencies. Routes POST /api/analyse directly to engine.analyse().
Allows full local testing of the web UI without Appwrite Cloud roundtrips!
"""

import sys
import os
import json
from http.server import HTTPServer, BaseHTTPRequestHandler

# Add functions/analyse/src to path
sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), "..", "functions", "analyse", "src")))
from engine import analyse


class AnalysisHandler(BaseHTTPRequestHandler):
    def _send_cors_headers(self):
        self.send_header("Access-Control-Allow-Origin", "*")
        self.send_header("Access-Control-Allow-Methods", "GET, POST, OPTIONS")
        self.send_header("Access-Control-Allow-Headers", "Content-Type, Authorization")

    def do_OPTIONS(self):
        self.send_response(204)
        self._send_cors_headers()
        self.end_headers()

    def do_GET(self):
        if self.path == "/health":
            self.send_response(200)
            self._send_cors_headers()
            self.send_header("Content-Type", "application/json")
            self.end_headers()
            self.wfile.write(b'{"status": "ok", "service": "local_stats_bridge"}')
        else:
            self.send_response(404)
            self.end_headers()

    def do_POST(self):
        if self.path == "/api/analyse" or self.path == "/analyse":
            content_length = int(self.headers.get("Content-Length", 0))
            body_bytes = self.rfile.read(content_length)
            try:
                payload = json.loads(body_bytes.decode("utf-8"))
                result = analyse(payload)
                resp_bytes = json.dumps(result).encode("utf-8")
                self.send_response(200)
                self._send_cors_headers()
                self.send_header("Content-Type", "application/json")
                self.send_header("Content-Length", str(len(resp_bytes)))
                self.end_headers()
                self.wfile.write(resp_bytes)
            except Exception as e:
                err_resp = json.dumps({"verdict": "invalid", "error": str(e)}).encode("utf-8")
                self.send_response(400)
                self._send_cors_headers()
                self.send_header("Content-Type", "application/json")
                self.send_header("Content-Length", str(len(err_resp)))
                self.end_headers()
                self.wfile.write(err_resp)
        else:
            self.send_response(404)
            self.end_headers()

    def log_message(self, format, *args):
        # Keep terminal quiet
        pass


def run(port=5000):
    server_address = ("127.0.0.1", port)
    httpd = HTTPServer(server_address, AnalysisHandler)
    print(f"Local Stats API Bridge active on http://127.0.0.1:{port}/api/analyse")
    try:
        httpd.serve_forever()
    except KeyboardInterrupt:
        pass


if __name__ == "__main__":
    port = int(sys.argv[1]) if len(sys.argv) > 1 else 5000
    run(port)
