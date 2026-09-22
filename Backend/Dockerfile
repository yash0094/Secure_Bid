# --- build the frontend -----------------------------------------------
FROM node:20-slim AS frontend
WORKDIR /app/frontend
COPY frontend/package.json frontend/package-lock.json ./
RUN npm ci
COPY frontend/ ./
RUN npm run build

# --- runtime -------------------------------------------------------------
FROM python:3.12-slim
WORKDIR /app

COPY requirements.txt ./
RUN pip install --no-cache-dir -r requirements.txt

COPY backend/ ./backend/
COPY run.py ./
COPY --from=frontend /app/frontend/dist ./frontend/dist

ENV PORT=8000
EXPOSE 8000
CMD ["python", "run.py"]
