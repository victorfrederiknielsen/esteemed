package domain

import (
	"fmt"
	"math/rand"
)

var adjectives = []string{
	// Original
	"brave", "clever", "happy", "swift", "calm",
	"bold", "bright", "quick", "gentle", "kind",
	"wise", "cool", "epic", "fancy", "grand",
	"jolly", "keen", "lucky", "merry", "noble",
	"proud", "quiet", "rapid", "sharp", "smart",
	"sunny", "super", "tiny", "vast", "warm",
	// Extended
	"agile", "eager", "fair", "fierce", "free",
	"golden", "great", "hardy", "humble", "lively",
	"mighty", "nimble", "peaceful", "playful", "radiant",
	"serene", "silent", "steady", "true", "vivid",
}

var roomNouns = []string{
	// Celestial
	"nebula", "comet", "nova", "aurora", "cosmos",
	"meteor", "eclipse", "orbit", "galaxy", "zenith",
	"solstice", "pulsar", "quasar", "corona", "vortex",
	// Terrain/Geography
	"canyon", "summit", "ridge", "mesa", "glacier",
	"delta", "reef", "basin", "peak", "fjord",
	"plateau", "dune", "ravine", "tundra", "crater",
	"valley", "cliff", "oasis",
	// Nature
	"meadow", "forest", "willow", "cedar", "grove",
	"brook", "glade", "fern", "lotus", "sequoia",
	"marsh", "birch", "aspen", "cypress", "prairie",
	"river", "lagoon",
}

// GenerateRoomName creates a fun room name in the format adjective-noun
// e.g., "brave-nebula", "swift-canyon", "calm-meadow"
func GenerateRoomName() string {
	adj := adjectives[rand.Intn(len(adjectives))]
	noun := roomNouns[rand.Intn(len(roomNouns))]

	return fmt.Sprintf("%s-%s", adj, noun)
}

// GenerateID creates a short unique identifier
func GenerateID() string {
	const chars = "abcdefghijklmnopqrstuvwxyz0123456789"
	result := make([]byte, 8)
	for i := range result {
		result[i] = chars[rand.Intn(len(chars))]
	}
	return string(result)
}

// GenerateSessionToken creates a secure session token
func GenerateSessionToken() string {
	const chars = "abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789"
	result := make([]byte, 32)
	for i := range result {
		result[i] = chars[rand.Intn(len(chars))]
	}
	return string(result)
}
