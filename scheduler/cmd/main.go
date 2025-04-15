package main

import (
	"log"

	"github.com/joho/godotenv"
	"github.com/robfig/cron/v3"

	"scheduler/internal/config"
	"scheduler/internal/jobs"
	"scheduler/internal/publisher"
	"scheduler/internal/server"
	"scheduler/internal/storage"
)

func main() {
	// Load environment variables
	err := godotenv.Overload(".env")
	if err != nil {
		log.Println("Warning: Error loading .env file, using environment variables")
	}

	// Initialize configuration
	cfg := config.New()
	log.Println("HTTP server port:", cfg.HTTPPort)

	// Start the HTTP server in a goroutine
	go server.Start(cfg)

	// Connect to Redis
	redisClient, err := storage.NewRedisClient(cfg)
	if err != nil {
		log.Fatalf("Failed to connect to Redis: %v", err)
	}
	defer redisClient.Close()

	// Initialize RabbitMQ publisher
	msgPublisher, err := publisher.NewRabbitMQPublisher(cfg)
	if err != nil {
		log.Fatalf("Failed to initialize RabbitMQ publisher: %v", err)
	}
	defer msgPublisher.Close()

	// Create a new cron scheduler
	c := cron.New(cron.WithSeconds())

	// Initialize Tibia Boss job
	tibiaBossJob := jobs.NewTibiaBossJob(cfg, redisClient, msgPublisher)

	// Run the job immediately at startup
	log.Println("Running jobs at startup...")
	go tibiaBossJob.Run()

	// Add Tibia boss job to run every 2 minutes
	_, err = c.AddFunc("0 */2 * * * *", func() {
		// Run in goroutine to ensure non-blocking behavior
		go tibiaBossJob.Run()
	})
	if err != nil {
		log.Fatalf("Error adding Tibia boss job: %v", err)
	}

	// You can add more jobs here in the future with immediate execution
	// anotherJob := jobs.NewAnotherJob(cfg, redisClient, msgPublisher)
	// go anotherJob.Run() // Run immediately
	// _, err = c.AddFunc("0 */10 * * * *", func() {
	//     go anotherJob.Run()
	// })

	// Start the scheduler
	c.Start()
	log.Println("Scheduler service started successfully")

	// Keep the application running
	select {}
}
