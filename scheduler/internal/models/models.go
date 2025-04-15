package models

import "time"

// TibiaAPIResponse represents the structure of the Tibia API response
type TibiaAPIResponse struct {
	BoostableBosses struct {
		Boosted struct {
			Name     string `json:"name"`
			ImageURL string `json:"image_url"`
		} `json:"boosted"`
	} `json:"boostable_bosses"`
}

// NotificationMessage represents the structure of messages sent to RabbitMQ
type NotificationMessage struct {
	ID        string                 `json:"id"`
	Type      string                 `json:"type"`
	Message   string                 `json:"message"`
	ImageURL  string                 `json:"image_url,omitempty"`
	ExtraInfo map[string]interface{} `json:"extra_info,omitempty"`
	CreatedAt time.Time              `json:"created_at"`
}

// NewNotificationMessage creates a new notification message with default values
func NewNotificationMessage(msgType, message, imageURL string) *NotificationMessage {
	return &NotificationMessage{
		ID:        time.Now().Format("20060102150405"),
		Type:      msgType,
		Message:   message,
		ImageURL:  imageURL,
		ExtraInfo: make(map[string]interface{}),
		CreatedAt: time.Now(),
	}
}
