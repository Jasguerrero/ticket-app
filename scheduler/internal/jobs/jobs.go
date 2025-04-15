package jobs

// Job represents a scheduled job interface
type Job interface {
	// Run executes the job
	Run()
}
