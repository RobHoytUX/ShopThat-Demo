FROM python:3.11-slim

WORKDIR /app

COPY requirements.txt .
RUN pip install --upgrade pip
RUN pip install -r requirements.txt

COPY keyword_extractor.py .

ENTRYPOINT ["python", "keyword_extractor.py"]

