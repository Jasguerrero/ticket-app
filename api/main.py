from api import create_app
from prometheus_flask_exporter import PrometheusMetrics

app = create_app()

# Use a different path to avoid conflicts
metrics = PrometheusMetrics(app)

if __name__ == "__main__":
    app.run(host="0.0.0.0", port=5000)
