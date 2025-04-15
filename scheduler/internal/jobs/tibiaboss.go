package jobs

import (
	"context"
	"encoding/json"
	"fmt"
	"io"
	"log"
	"net/http"
	"path/filepath"
	"time"

	"scheduler/internal/config"
	"scheduler/internal/models"
	"scheduler/internal/publisher"
	"scheduler/internal/storage"
)

// TibiaBossJob handles checking for boosted boss changes
type TibiaBossJob struct {
	cfg        *config.Config
	redis      *storage.RedisClient
	publisher  *publisher.RabbitMQPublisher
	redisKey   string
	redisTTL   time.Duration
}

// NewTibiaBossJob creates a new Tibia boss job
func NewTibiaBossJob(
	cfg *config.Config,
	redis *storage.RedisClient,
	publisher *publisher.RabbitMQPublisher) *TibiaBossJob {
	
	return &TibiaBossJob{
		cfg:       cfg,
		redis:     redis,
		publisher: publisher,
		redisKey:  "last_boss_response",
		redisTTL:  36 * time.Hour,
	}
}

// Run executes the Tibia boss job
func (j *TibiaBossJob) Run() {
	// Recover from panics
	defer func() {
		if r := recover(); r != nil {
			log.Printf("Recovered from panic in Tibia boss job: %v", r)
		}
	}()

	log.Println("Running Tibia boosted boss check job...")

	// Get boss information from Tibia API
	bossName, imageFilename, err := j.getBoostedBossInfo()
	if err != nil {
		log.Printf("Error getting boosted boss: %v", err)
		return
	}

	// Format the response message
	response := fmt.Sprintf("Boosted boss: %s", bossName)

	// Get last stored response from Redis
	lastResponse, err := j.redis.Get(j.redisKey)
	if err != nil {
		log.Printf("Error retrieving last response from Redis: %v", err)
	}

	// Check if the response has changed
	if response != lastResponse {
		log.Println("Boss has changed, sending notification...")

		// Create image URL if image exists
		publicImageURL := ""
		if imageFilename != "" {
			publicImageURL = fmt.Sprintf("%s/images/%s", j.cfg.ServerURL, imageFilename)
		}

		// Create notification message
		notification := models.NewNotificationMessage(
			"tibia_notification",
			response,
			publicImageURL,
		)
		notification.ExtraInfo["boss_name"] = bossName
		notification.ExtraInfo["media"] = "image_text"

		// Send to publisher
		if err := j.publisher.Publish(*notification); err != nil {
			log.Printf("Error publishing notification: %v", err)
			return
		}

		// Update Redis with new response
		if err := j.redis.Set(j.redisKey, response, j.redisTTL); err != nil {
			log.Printf("Error updating Redis: %v", err)
		}

		log.Println("Notification sent and Redis updated")
	} else {
		log.Println("Boss information unchanged, no notification sent")
	}
}

// getBoostedBossInfo fetches information about the boosted boss from the API
func (j *TibiaBossJob) getBoostedBossInfo() (string, string, error) {
	url := fmt.Sprintf("%s/boostablebosses/", j.cfg.TibiaAPIURL)
	
	// Use context with timeout for the HTTP request
	ctx, cancel := context.WithTimeout(context.Background(), 10*time.Second)
	defer cancel()
	
	req, err := http.NewRequestWithContext(ctx, "GET", url, nil)
	if err != nil {
		return "", "", fmt.Errorf("error creating request: %v", err)
	}
	
	client := &http.Client{}
	resp, err := client.Do(req)
	if err != nil {
		return "", "", fmt.Errorf("API request failed: %v", err)
	}
	defer resp.Body.Close()

	if resp.StatusCode != http.StatusOK {
		return "", "", fmt.Errorf("API returned non-200 status: %d", resp.StatusCode)
	}

	body, err := io.ReadAll(resp.Body)
	if err != nil {
		return "", "", fmt.Errorf("failed to read response body: %v", err)
	}

	var bossResp models.TibiaAPIResponse
	err = json.Unmarshal(body, &bossResp)
	if err != nil {
		return "", "", fmt.Errorf("failed to parse JSON: %v", err)
	}

	if bossResp.BoostableBosses.Boosted.Name == "" {
		return "", "", fmt.Errorf("no boosted boss found in API response")
	}

	// Extract just the filename from the image URL
	imageFilename := filepath.Base(bossResp.BoostableBosses.Boosted.ImageURL)
	
	return bossResp.BoostableBosses.Boosted.Name, imageFilename, nil
}
