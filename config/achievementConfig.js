const ACHIEVEMENT_CONFIG = {
  POINTS_THRESHOLDS: {
    RISING_STAR: { 
      threshold: 1000, 
      name: "Rising Star", 
      description: "First major milestone",
      badge: "⭐"
    },
    SEASONED_EXPLORER: { 
      threshold: 2000, 
      name: "Seasoned Explorer", 
      description: "Proven track record",
      badge: "🌟"
    },
    ELITE_CHAMPION: { 
      threshold: 3000, 
      name: "Elite Champion", 
      description: "Top-tier performance",
      badge: "🏆"
    },
    LEGENDARY_MASTER: { 
      threshold: 5000, 
      name: "Legendary Master", 
      description: "Ultimate achievement",
      badge: "👑"
    }
  },
  
  ACTIVITY_SPECIALIZATION: {
    CODECRAFT_MASTER: { 
      threshold: 60, 
      activityType: "coding", 
      minTotalPoints: 1000,
      name: "CodeCraft Master",
      description: "Dominates coding challenges",
      badge: "💻"
    },
    VISUAL_VIRTUOSO: { 
      threshold: 60, 
      activityType: "design", 
      minTotalPoints: 1000,
      name: "Visual Virtuoso", 
      description: "Master of design activities",
      badge: "🎨"
    },
    WORDSMITH_ELITE: { 
      threshold: 60, 
      activityType: "writing", 
      minTotalPoints: 1000,
      name: "WordSmith Elite", 
      description: "Master of writing activities",
      badge: "✍️"
    },
    DISCOVERY_PIONEER: { 
      threshold: 60, 
      activityType: "research", 
      minTotalPoints: 1000,
      name: "Discovery Pioneer", 
      description: "Master of research activities",
      badge: "🔍"
    }
  },
  
  SPECIAL_BADGES: {
    FIRST_STEPS: { 
      criteria: "first_bounty_completion",
      name: "First Steps",
      description: "Completed first bounty",
      badge: "👣"
    },
    FLAWLESS_VICTORY: { 
      criteria: "perfect_score",
      name: "Flawless Victory", 
      description: "Perfect score in any bounty",
      badge: "💯"
    },
    CONSISTENCY_KING: { 
      criteria: "consecutive_completions",
      threshold: 5,
      name: "Consistency King", 
      description: "5+ consecutive bounty completions",
      badge: "👑"
    },
    LIGHTNING_FAST: { 
      criteria: "fast_completion",
      threshold: 24, // hours
      name: "Lightning Fast", 
      description: "Completion in record time",
      badge: "⚡"
    }
  }
};

module.exports = ACHIEVEMENT_CONFIG;
