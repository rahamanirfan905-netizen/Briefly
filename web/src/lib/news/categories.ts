export interface CategoryDef {
  slug: string;
  name: string;
  keywords: string[];
}

/**
 * "india" and "world" are regions, shown as their own feeds, but they exist
 * as categories too so every URL under /category/<slug> works. Articles are
 * never classified INTO india/world by keyword; those feeds filter on region.
 */
export const CATEGORIES: CategoryDef[] = [
  { slug: "india", name: "India", keywords: [] },
  { slug: "world", name: "World", keywords: [] },
  {
    slug: "politics",
    name: "Politics",
    keywords: ["election", "parliament", "lok sabha", "rajya sabha", "minister", "government", "congress", "bjp", "senate", "president", "prime minister", "cabinet", "policy", "bill", "campaign", "vote", "mp ", "mla", "supreme court", "opposition", "coalition", "diplomat", "summit", "sanction"],
  },
  {
    slug: "business",
    name: "Business & Economy",
    keywords: ["economy", "gdp", "inflation", "rbi", "sensex", "nifty", "stock", "market", "shares", "bank", "rupee", "dollar", "trade", "tariff", "company", "profit", "earnings", "ipo", "startup", "investment", "merger", "fiscal", "budget", "interest rate", "oil price", "revenue"],
  },
  {
    slug: "technology",
    name: "Technology",
    keywords: ["tech", "ai ", "artificial intelligence", "software", "app ", "google", "apple", "microsoft", "openai", "anthropic", "chip", "semiconductor", "smartphone", "cyber", "internet", "startup", "robot", "cloud", "data centre", "data center", "5g", "iphone", "android"],
  },
  {
    slug: "science",
    name: "Science & Research",
    keywords: ["scientist", "research", "study", "isro", "nasa", "space", "satellite", "astronomy", "physics", "quantum", "genome", "discovery", "telescope", "laboratory", "mission", "rocket", "mars", "moon"],
  },
  {
    slug: "defence",
    name: "Defence & Security",
    keywords: ["army", "navy", "air force", "military", "defence", "defense", "missile", "border", "terror", "security forces", "war", "troops", "drone", "nato", "ceasefire", "weapons", "airstrike", "intelligence", "lac", "loc"],
  },
  {
    slug: "sports",
    name: "Sports",
    keywords: ["cricket", "football", "match", "tournament", "olympic", "ipl", "bcci", "fifa", "tennis", "hockey", "world cup", "champion", "league", "goal", "wicket", "badminton", "athlete", "grand slam", "formula 1", "f1", "coach"],
  },
  {
    slug: "entertainment",
    name: "Entertainment",
    keywords: ["film", "movie", "bollywood", "hollywood", "actor", "actress", "box office", "album", "singer", "netflix", "web series", "festival", "celebrity", "concert", "film director", "oscars", "trailer", "streaming", "music"],
  },
  {
    slug: "health",
    name: "Health",
    keywords: ["health", "hospital", "disease", "vaccine", "virus", "doctor", "cancer", "world health organization", "medical", "patients", "drug", "treatment", "outbreak", "mental health", "diabetes", "clinical", "icmr", "epidemic"],
  },
  {
    slug: "education",
    name: "Education",
    keywords: ["school", "university", "student", "exam", "neet", "jee", "cbse", "college", "education", "teacher", "scholarship", "admission", "curriculum", "ugc", "iit", "campus", "exam results"],
  },
  {
    slug: "environment",
    name: "Environment",
    keywords: ["climate", "emission", "pollution", "air quality", "flood", "cyclone", "wildlife", "forest", "carbon", "renewable", "solar", "biodiversity", "heatwave", "drought", "monsoon", "cop30", "glacier", "wildfire", "earthquake", "environment"],
  },
];

/** Provider section names (e.g. Guardian) mapped onto our slugs. */
export const HINT_MAP: Record<string, string> = {
  politics: "politics",
  "us-news": "politics",
  uk: "politics",
  business: "business",
  money: "business",
  economy: "business",
  technology: "technology",
  tech: "technology",
  science: "science",
  sport: "sports",
  sports: "sports",
  football: "sports",
  cricket: "sports",
  culture: "entertainment",
  film: "entertainment",
  music: "entertainment",
  entertainment: "entertainment",
  health: "health",
  education: "education",
  environment: "environment",
  "global-development": "world",
  "world": "world",
  defence: "defence",
};

export const NAV_CATEGORIES = ["india", "world", "business", "technology", "politics", "science", "sports", "entertainment"];
