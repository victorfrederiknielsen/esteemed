const adjectives = [
  "brave",
  "clever",
  "happy",
  "swift",
  "calm",
  "bold",
  "bright",
  "quick",
  "gentle",
  "kind",
  "wise",
  "cool",
  "epic",
  "fancy",
  "grand",
  "jolly",
  "keen",
  "lucky",
  "merry",
  "noble",
  "proud",
  "quiet",
  "rapid",
  "sharp",
  "smart",
  "sunny",
  "super",
  "tiny",
  "vast",
  "warm",
];

const animals = [
  "falcon",
  "dolphin",
  "penguin",
  "tiger",
  "eagle",
  "panda",
  "koala",
  "otter",
  "fox",
  "owl",
  "wolf",
  "bear",
  "hawk",
  "lynx",
  "raven",
  "shark",
  "whale",
  "seal",
  "deer",
  "hare",
  "crane",
  "finch",
  "gecko",
  "ibis",
  "jay",
  "kiwi",
  "lemur",
  "moose",
  "newt",
  "ocelot",
];

function capitalize(str: string): string {
  return str.charAt(0).toUpperCase() + str.slice(1);
}

export function generateParticipantName(): string {
  const adjective = adjectives[Math.floor(Math.random() * adjectives.length)];
  const animal = animals[Math.floor(Math.random() * animals.length)];
  return `${capitalize(adjective)} ${capitalize(animal)}`;
}
