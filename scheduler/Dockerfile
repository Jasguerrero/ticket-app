FROM golang:1.24-alpine AS builder

# Install build dependencies
RUN apk add --no-cache git

# Set working directory
WORKDIR /app

# Copy go.mod and go.sum files
COPY scheduler/go.mod scheduler/go.sum ./scheduler/

# Download dependencies
WORKDIR /app/scheduler
RUN go mod download

# Copy source code, images, and .env file (which is already included in ./scheduler)
WORKDIR /app
COPY ./scheduler ./scheduler

# Build the application
WORKDIR /app/scheduler
RUN CGO_ENABLED=0 GOOS=linux go build -a -installsuffix cgo -o app_binary ./cmd/main.go

# Create a minimal image
FROM alpine:3.21

RUN apk --no-cache add ca-certificates tzdata

WORKDIR /app

# Create directory structure
RUN mkdir -p /app/scheduler/images

# Copy the binary from builder
COPY --from=builder /app/scheduler/app_binary /app/app_binary

# Copy images directory and .env file to multiple potential locations
COPY --from=builder /app/scheduler/images/ /app/scheduler/images/
COPY --from=builder /app/scheduler/.env /app/.env
COPY --from=builder /app/scheduler/.env /app/scheduler/.env
COPY --from=builder /app/scheduler/.env /.env

# Expose the specific HTTP port
EXPOSE 4177

# Set working directory to match how your app might be searching for .env
WORKDIR /app/scheduler

# Run the application from the scheduler directory
CMD ["sh", "-c", "cd /app/scheduler && /app/app_binary"]