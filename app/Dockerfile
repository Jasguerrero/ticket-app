FROM python:3.11
WORKDIR /server
COPY ./app ./app
ENV PYTHONPATH="/server:${PYTHONPATH}"
RUN pip install --no-cache-dir -r app/requirements.txt
CMD ["streamlit", "run", "app/main.py", "--server.port=8501", "--server.address=0.0.0.0"]
