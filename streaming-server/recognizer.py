# recognizer.py
import os
import cv2
import pickle
import asyncio
import websockets
import face_recognition
import json
import time

# -------------------
# Config
# -------------------
FACES_DIR = r"C:\Users\mark\Desktop\CloudinaryBackup\facedata\instructor\68a74fd49941aa012f5c0a2f"
ENCODINGS_FILE = "face_encodings.pkl"
SAVE_DIR = r"C:\Users\mark\Documents\GitHub\eduvision\streaming-server\detections"
WS_PORT = 8080  # WebSocket server port

os.makedirs(SAVE_DIR, exist_ok=True)

# -------------------
# Step 1: Load or Build Encodings
# -------------------
if not os.path.exists(ENCODINGS_FILE):
    print("[INFO] Building face encodings...")
    known_encodings = []
    known_names = []

    for person_name in os.listdir(FACES_DIR):
        person_folder = os.path.join(FACES_DIR, person_name)
        if not os.path.isdir(person_folder):
            continue

        for file in os.listdir(person_folder):
            file_path = os.path.join(person_folder, file)
            if not file.lower().endswith((".jpg", ".jpeg", ".png")):
                continue

            image = face_recognition.load_image_file(file_path)
            encodings = face_recognition.face_encodings(image)
            if encodings:
                known_encodings.append(encodings[0])
                known_names.append(person_name)
                print(f"[INFO] Added encoding for {person_name} from {file}")

    with open(ENCODINGS_FILE, "wb") as f:
        pickle.dump((known_encodings, known_names), f)
    print("[INFO] Encodings built and saved.")

else:
    print("[INFO] Loading encodings from file...")
    with open(ENCODINGS_FILE, "rb") as f:
        known_encodings, known_names = pickle.load(f)
    print(f"[INFO] Loaded {len(known_names)} known faces.")


# -------------------
# Step 2: Face Recognition + Streaming
# -------------------
def save_face_event(frame, name):
    timestamp = int(time.time())
    filename = f"{SAVE_DIR}/{name}_{timestamp}.jpg"
    cv2.imwrite(filename, frame)
    print(f"[INFO] Snapshot saved: {filename}")


async def video_stream(websocket):
    # Change this to RTSP if using Hikvision
    cap = cv2.VideoCapture(0)

    while True:
        ret, frame = cap.read()
        if not ret:
            continue

        rgb_frame = frame[:, :, ::-1]

        # Detect faces
        locations = face_recognition.face_locations(rgb_frame)
        encodings = face_recognition.face_encodings(rgb_frame, locations)

        detections = []
        for (top, right, bottom, left), face_encoding in zip(locations, encodings):
            matches = face_recognition.compare_faces(known_encodings, face_encoding, tolerance=0.5)
            name = "Unknown"

            if True in matches:
                match_index = matches.index(True)
                name = known_names[match_index]

            # Save snapshot when a known face is detected
            if name != "Unknown":
                save_face_event(frame, name)

            # Detection payload for React
            detections.append({
                "box": [int(left), int(top), int(right - left), int(bottom - top)],
                "name": name
            })

        # Send JSON detections
        if detections:
            await websocket.send(json.dumps({"type": "detections", "faces": detections}))

        # Encode frame as JPEG and send
        _, jpeg = cv2.imencode(".jpg", frame)
        await websocket.send(jpeg.tobytes())

    cap.release()


async def main():
    async with websockets.serve(video_stream, "0.0.0.0", WS_PORT, max_size=2**25):
        print(f"[INFO] WebSocket server running at ws://localhost:{WS_PORT}")
        await asyncio.Future()  # keep running


if __name__ == "__main__":
    asyncio.run(main())
