# backend/app/ai.py

from ultralytics import YOLO

# AI model
model = YOLO("yolov8n.pt")