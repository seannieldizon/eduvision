import asyncio, json, time, os, cv2, numpy as np, websockets, requests
import cloudinary
from cloudinary.api import resources
from pathlib import Path

# ---------------- Config ----------------
RTSP_URL = "rtsp://admin:Eduvision124@192.168.8.5:554/Streaming/Channels/101"
OUT_WS_PORT = 8765
CONFIDENCE = 1.8  # LBPH lower is better; tune threshold (~0.8–3.0)

# Cloudinary config
cloudinary.config(
    cloud_name="deqtxoewp",
    api_key="429458566368881",
    api_secret="1NPDJVTgxydH8VCOD7w-NLhFVdc"
)
DATASET_DIR = "eduvision/users/<user_id>/face_registration/"

MODEL_PATH = "lbph_model.xml"
LABELS_PATH = "labels.txt"
# ----------------------------------------


# --- Face detector (fast, CPU-friendly) ---
CASCADE_PATH = cv2.data.haarcascades + "haarcascade_frontalface_default.xml"
face_cascade = cv2.CascadeClassifier(CASCADE_PATH)


def download_cloudinary_faces():
    """Download images from Cloudinary 'faces/' folder into local dataset."""
    os.makedirs(DATASET_DIR, exist_ok=True)

    print("Fetching face images from Cloudinary...")
    result = resources(
    type="upload",
    prefix="eduvision/users/",   # start from here
    max_results=100
)

    for item in result.get("resources", []):
        url = item["secure_url"]
        public_id = item["public_id"]  # e.g. faces/Alice/img1
        parts = public_id.split("/")
        if len(parts) < 2:
            continue
        if len(parts) >= 4 and parts[3] == "face_registration":
            person = parts[2]  # use <user_id> as label
            person_dir = os.path.join(DATASET_DIR, person)
            os.makedirs(person_dir, exist_ok=True)

            img_name = os.path.basename(public_id) + ".jpg"
            img_path = os.path.join(person_dir, img_name)

            r = requests.get(url, timeout=10)
            if r.status_code == 200:
                with open(img_path, "wb") as f:
                    f.write(r.content)
                print("Downloaded", img_path)

    print("Dataset synced from Cloudinary.")


def train_lbph_from_dataset():
    """Train LBPH recognizer from downloaded dataset."""
    images, labels, label_names = [], [], []
    label_map = {}
    next_id = 0

    for person in sorted(os.listdir(DATASET_DIR)):
        pdir = os.path.join(DATASET_DIR, person)
        if not os.path.isdir(pdir):
            continue
        if person not in label_map:
            label_map[person] = next_id
            label_names.append(person)
            next_id += 1
        for fn in os.listdir(pdir):
            fp = os.path.join(pdir, fn)
            img = cv2.imread(fp)
            if img is None:
                continue
            gray = cv2.cvtColor(img, cv2.COLOR_BGR2GRAY)
            images.append(gray)
            labels.append(label_map[person])

    if not images:
        raise RuntimeError("No training images found in dataset.")

    recog = cv2.face.LBPHFaceRecognizer_create(radius=1, neighbors=8, grid_x=8, grid_y=8)
    recog.train(images, np.array(labels))
    recog.save(MODEL_PATH)
    Path(LABELS_PATH).write_text("\n".join(label_names), encoding="utf-8")
    print(f"Trained LBPH model with {len(label_names)} classes:", label_names)
    return recog, label_names


# --- Load recognizer (after fetching + training) ---
download_cloudinary_faces()
recog, labels = train_lbph_from_dataset()


# --- WebSocket broadcasting ---
latest_payload = {}

async def ws_handler(websocket):
    try:
        await websocket.send(json.dumps({"type": "hello", "ok": True}))
        while True:
            await asyncio.sleep(0.033)  # ~30fps push
            if latest_payload:
                await websocket.send(json.dumps(latest_payload))
    except websockets.ConnectionClosed:
        pass


async def ws_server():
    async with websockets.serve(ws_handler, "0.0.0.0", OUT_WS_PORT, ping_interval=20):
        await asyncio.Future()  # run forever


def run_cv_loop():
    global latest_payload
    cap = cv2.VideoCapture(RTSP_URL, cv2.CAP_FFMPEG)
    if not cap.isOpened():
        raise RuntimeError("Cannot open RTSP stream")

    SCALE = 0.6  # downscale for speed

    while True:
        ok, frame = cap.read()
        if not ok:
            time.sleep(0.1)
            continue

        h, w = frame.shape[:2]
        if SCALE != 1.0:
            frame = cv2.resize(frame, (int(w*SCALE), int(h*SCALE)), interpolation=cv2.INTER_LINEAR)
            h, w = frame.shape[:2]

        gray = cv2.cvtColor(frame, cv2.COLOR_BGR2GRAY)

        faces = face_cascade.detectMultiScale(gray, scaleFactor=1.1, minNeighbors=4, minSize=(60, 60))

        out = []
        for (x, y, fw, fh) in faces:
            roi = gray[y:y+fh, x:x+fw]
            roi = cv2.equalizeHist(cv2.resize(roi, (200, 200)))
            try:
                pred_id, dist = recog.predict(roi)
                name = labels[pred_id] if 0 <= pred_id < len(labels) else "Unknown"
                if dist > (CONFIDENCE * 50):
                    name = "Unknown"
            except Exception:
                name = "Unknown"
                dist = 9999.0

            out.append({
                "x": int(x / SCALE if SCALE != 1.0 else x),
                "y": int(y / SCALE if SCALE != 1.0 else y),
                "w": int(fw / SCALE if SCALE != 1.0 else fw),
                "h": int(fh / SCALE if SCALE != 1.0 else fh),
                "name": name,
                "score": float(dist)
            })

        latest_payload = {
            "type": "faces",
            "ts": time.time(),
            "boxes": out
        }


def main():
    import threading
    t = threading.Thread(target=run_cv_loop, daemon=True)
    t.start()
    asyncio.run(ws_server())


if __name__ == "__main__":
    main()
