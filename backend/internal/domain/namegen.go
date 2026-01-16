package domain

import (
	"fmt"
	"math/rand"
)

var adjectives = []string{
	"brave", "clever", "happy", "swift", "calm",
	"bold", "bright", "quick", "gentle", "kind",
	"wise", "cool", "epic", "fancy", "grand",
	"jolly", "keen", "lucky", "merry", "noble",
	"proud", "quiet", "rapid", "sharp", "smart",
	"sunny", "super", "tiny", "vast", "warm",
}

var animals = []string{
	"falcon", "dolphin", "penguin", "tiger", "eagle",
	"panda", "koala", "otter", "fox", "owl",
	"wolf", "bear", "hawk", "lynx", "raven",
	"shark", "whale", "seal", "deer", "hare",
	"crane", "finch", "gecko", "ibis", "jay",
	"kiwi", "lemur", "moose", "newt", "ocelot",
}

// GenerateRoomName creates a fun room name in the format adjective-animal-number
// e.g., "brave-falcon-42", "clever-penguin-17"
func GenerateRoomName() string {
	adj := adjectives[rand.Intn(len(adjectives))]
	animal := animals[rand.Intn(len(animals))]
	number := rand.Intn(100) // 0-99

	return fmt.Sprintf("%s-%s-%02d", adj, animal, number)
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
