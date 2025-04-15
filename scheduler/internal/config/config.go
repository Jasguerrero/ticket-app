package config

import (
	"log"
	"os"
	"fmt"
)

// Config holds all configuration parameters
type Config struct {
	// Redis Configuration
	RedisHost     string
	RedisPort     string
	RedisPassword string

	// RabbitMQ Configuration
	RabbitMQUser     string
	RabbitMQPassword string
	RabbitMQHost     string
	RabbitMQPort     string
	QueueName        string

	// HTTP Server
	ServerURL string
	HTTPPort  string

	// File paths
	ImagesPath string

	// API URLs
	TibiaAPIURL string
}

// New creates a new configuration with values from environment variables
func New() *Config {
	cfg := &Config{
		// Redis Configuration
		RedisHost:     os.Getenv("REDIS_HOST"),
		RedisPort:     os.Getenv("REDIS_PORT"),
		RedisPassword: os.Getenv("REDIS_PASSWORD"),

		// RabbitMQ Configuration
		RabbitMQUser:     os.Getenv("RABBITMQ_USER"),
		RabbitMQPassword: os.Getenv("RABBITMQ_PASSWORD"),
		RabbitMQHost:     os.Getenv("RABBITMQ_HOST"),
		RabbitMQPort:     os.Getenv("RABBITMQ_PORT"),
		QueueName:        os.Getenv("QUEUE_NAME"),

		// HTTP Server
		ServerURL: getEnvWithDefault("SERVER_URL", fmt.Sprintf("http://scheduler-service:%s", os.Getenv("HTTP_PORT"))),
		HTTPPort:  os.Getenv("HTTP_PORT"),

		// File paths
		ImagesPath: "./images/tibia_boss_images/",

		// API URLs
		TibiaAPIURL: os.Getenv("TIBIA_API_URL"),
	}

	// Create images directory if it doesn't exist
	ensureDirectoryExists(cfg.ImagesPath)

	return cfg
}

// getEnvWithDefault returns the value of the environment variable or the provided default
func getEnvWithDefault(key, defaultValue string) string {
	value := os.Getenv(key)
	if value == "" {
		return defaultValue
	}
	return value
}

// ensureDirectoryExists creates the directory if it doesn't exist
func ensureDirectoryExists(path string) {
	if _, err := os.Stat(path); os.IsNotExist(err) {
		log.Printf("Error: path %v does not exist", path)
		os.Exit(1)
	}
}
