package publisher

import (
	"context"
	"encoding/json"
	"fmt"
	"log"
	"sync"
	"time"

	amqp "github.com/rabbitmq/amqp091-go"
	"scheduler/internal/config"
	"scheduler/internal/models"
)

// RabbitMQPublisher handles publishing messages to RabbitMQ
type RabbitMQPublisher struct {
	connection   *amqp.Connection
	channel      *amqp.Channel
	exchangeName string
	routingKey   string
	asyncChannel chan models.NotificationMessage
	publishMutex sync.Mutex
}

// NewRabbitMQPublisher creates a new RabbitMQ publisher
func NewRabbitMQPublisher(cfg *config.Config) (*RabbitMQPublisher, error) {
	// Create RabbitMQ connection URL
	rabbitURL := fmt.Sprintf("amqp://%s:%s@%s:%s/",
		cfg.RabbitMQUser,
		cfg.RabbitMQPassword,
		cfg.RabbitMQHost,
		cfg.RabbitMQPort)

	// Connect to RabbitMQ
	conn, err := amqp.Dial(rabbitURL)
	if err != nil {
		return nil, fmt.Errorf("error connecting to RabbitMQ: %v", err)
	}

	// Create a channel
	ch, err := conn.Channel()
	if err != nil {
		conn.Close()
		return nil, fmt.Errorf("error creating RabbitMQ channel: %v", err)
	}

	// Check if exchange exists without trying to recreate it
	err = ch.ExchangeDeclarePassive(
		"notifications", // exchange name
		"direct",        // exchange type (still required, but will only be checked, not enforced)
		true,            // durable
		false,           // auto-deleted
		false,           // internal
		false,           // no-wait
		nil,             // arguments
	)
	if err != nil {
		ch.Close()
		conn.Close()
		return nil, fmt.Errorf("error declaring exchange: %v", err)
	}

	// Create publisher
	publisher := &RabbitMQPublisher{
		connection:   conn,
		channel:      ch,
		exchangeName: "notifications",
		routingKey:   "user.notification",
		asyncChannel: make(chan models.NotificationMessage, 100),
		publishMutex: sync.Mutex{},
	}

	// Start the async publisher worker
	go publisher.startAsyncWorker()

	log.Println("Successfully connected to RabbitMQ")
	return publisher, nil
}

// Close closes the RabbitMQ connection and channel
func (p *RabbitMQPublisher) Close() error {
	if p.channel != nil {
		p.channel.Close()
	}
	if p.connection != nil {
		return p.connection.Close()
	}
	return nil
}

// Publish sends a message to RabbitMQ
func (p *RabbitMQPublisher) Publish(msg models.NotificationMessage) error {
	// Try the async channel first, fall back to direct publish if channel is full
	select {
	case p.asyncChannel <- msg:
		return nil
	default:
		// Channel is full, publish directly
		log.Println("Async channel is full, publishing directly")
		return p.publishDirect(msg)
	}
}

// publishDirect sends a message directly to RabbitMQ
func (p *RabbitMQPublisher) publishDirect(msg models.NotificationMessage) error {
	// Use mutex to prevent concurrent publishing
	p.publishMutex.Lock()
	defer p.publishMutex.Unlock()

	// Create context with timeout
	ctx, cancel := context.WithTimeout(context.Background(), 5*time.Second)
	defer cancel()

	// Marshal message to JSON
	body, err := json.Marshal(msg)
	if err != nil {
		return fmt.Errorf("error marshalling message to JSON: %v", err)
	}

	// Publish to RabbitMQ
	err = p.channel.PublishWithContext(
		ctx,
		p.exchangeName, // exchange
		p.routingKey,   // routing key
		false,          // mandatory
		false,          // immediate
		amqp.Publishing{
			ContentType:  "application/json",
			Body:         body,
			DeliveryMode: amqp.Persistent, // Message persistence (2 = persistent)
		},
	)

	if err != nil {
		return fmt.Errorf("error publishing message: %v", err)
	}
	return nil
}

// startAsyncWorker processes messages from the async channel
func (p *RabbitMQPublisher) startAsyncWorker() {
	for msg := range p.asyncChannel {
		if err := p.publishDirect(msg); err != nil {
			log.Printf("Error in async publisher: %v", err)
			// Could implement retry logic here
		}
	}
}
