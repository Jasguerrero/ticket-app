FROM python:3.11
WORKDIR /server
COPY ./api ./api
ENV PYTHONPATH="/server:${PYTHONPATH}"
RUN pip install --no-cache-dir -r api/requirements.txt
CMD ["python3", "api/main.py"]
