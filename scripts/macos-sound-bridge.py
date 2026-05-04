#!/usr/bin/env python3
from http.server import BaseHTTPRequestHandler, ThreadingHTTPServer
import json
import subprocess

HOST = "0.0.0.0"
PORT = 5056

COMMANDS = {
    "bell": ["afplay", "/System/Library/Sounds/Glass.aiff"],
    "hymn": ["osascript", "-e", "beep 3"],
    "custom": ["afplay", "/System/Library/Sounds/Glass.aiff"],
}


def play_fire_alarm():
    for _ in range(4):
        subprocess.run(["afplay", "/System/Library/Sounds/Sosumi.aiff"], check=False)
        subprocess.run(["afplay", "/System/Library/Sounds/Glass.aiff"], check=False)


def play_sound(sound_id):
    if sound_id == "fire_alarm":
        play_fire_alarm()
        return True

    command = COMMANDS.get(sound_id)
    if command is None:
        return False

    subprocess.run(command, check=False)
    return True


class Handler(BaseHTTPRequestHandler):
    def do_GET(self):
        if self.path == "/health":
            self.respond(200, {"success": True})
            return

        self.respond(404, {"success": False, "error": "Not found"})

    def do_POST(self):
        prefix = "/sounds/"
        if not self.path.startswith(prefix):
            self.respond(404, {"success": False, "error": "Not found"})
            return

        sound_id = self.path[len(prefix):]
        if not play_sound(sound_id):
            self.respond(400, {"success": False, "error": "Unknown sound"})
            return

        self.respond(200, {"success": True, "soundType": sound_id})

    def log_message(self, format, *args):
        return

    def respond(self, status, payload):
        body = json.dumps(payload).encode("utf-8")
        self.send_response(status)
        self.send_header("Content-Type", "application/json")
        self.send_header("Content-Length", str(len(body)))
        self.end_headers()
        self.wfile.write(body)


if __name__ == "__main__":
    server = ThreadingHTTPServer((HOST, PORT), Handler)
    print(f"macOS sound bridge listening on http://{HOST}:{PORT}")
    server.serve_forever()
