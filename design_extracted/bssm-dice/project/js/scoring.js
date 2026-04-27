// Yacht Dice scoring rules — traditional ruleset
// 12 categories. "Yacht" (5 of a kind) = 50 points.

const sumOf = (dice) => dice.reduce((a, b) => a + b, 0);
const counts = (dice) => {
  const c = [0, 0, 0, 0, 0, 0, 0]; // index 1..6
  for (const d of dice) c[d]++;
  return c;
};

window.YACHT_CATEGORIES = [
  // Upper section
  { id: "ones",   label: "Ones",            help: "Sum of all 1s",                section: "upper", score: (d) => d.filter(v => v === 1).length * 1 },
  { id: "twos",   label: "Twos",            help: "Sum of all 2s",                section: "upper", score: (d) => d.filter(v => v === 2).length * 2 },
  { id: "threes", label: "Threes",          help: "Sum of all 3s",                section: "upper", score: (d) => d.filter(v => v === 3).length * 3 },
  { id: "fours",  label: "Fours",           help: "Sum of all 4s",                section: "upper", score: (d) => d.filter(v => v === 4).length * 4 },
  { id: "fives",  label: "Fives",           help: "Sum of all 5s",                section: "upper", score: (d) => d.filter(v => v === 5).length * 5 },
  { id: "sixes",  label: "Sixes",           help: "Sum of all 6s",                section: "upper", score: (d) => d.filter(v => v === 6).length * 6 },

  // Lower section
  { id: "choice", label: "Choice",          help: "Sum of all dice",              section: "lower", score: (d) => sumOf(d) },
  { id: "fourkind", label: "Four of a Kind",help: "If ≥4 same, sum of those 4",   section: "lower",
    score: (d) => {
      const c = counts(d);
      for (let n = 6; n >= 1; n--) if (c[n] >= 4) return n * 4;
      return 0;
    }
  },
  { id: "fullhouse", label: "Full House",   help: "Three + two — sum of all dice",section: "lower",
    score: (d) => {
      const c = counts(d);
      const has3 = c.includes(3);
      const has2 = c.includes(2);
      // also: 5 of a kind counts as full house in some variants — we say no.
      if (has3 && has2) return sumOf(d);
      return 0;
    }
  },
  { id: "sstraight", label: "Small Straight", help: "4 in a row → 15",            section: "lower",
    score: (d) => {
      const set = new Set(d);
      const runs = [[1,2,3,4],[2,3,4,5],[3,4,5,6]];
      return runs.some(r => r.every(v => set.has(v))) ? 15 : 0;
    }
  },
  { id: "lstraight", label: "Large Straight", help: "5 in a row → 30",            section: "lower",
    score: (d) => {
      const set = new Set(d);
      const a = [1,2,3,4,5].every(v => set.has(v));
      const b = [2,3,4,5,6].every(v => set.has(v));
      return (a || b) ? 30 : 0;
    }
  },
  { id: "yacht", label: "Yacht",            help: "All 5 the same → 50",          section: "lower",
    score: (d) => {
      const c = counts(d);
      return c.some(n => n === 5) ? 50 : 0;
    }
  },
];

window.UPPER_BONUS_THRESHOLD = 63;
window.UPPER_BONUS_VALUE = 35;

window.makeEmptyScorecard = () => {
  const card = {};
  for (const cat of window.YACHT_CATEGORIES) card[cat.id] = null;
  return card;
};

window.computeTotals = (card) => {
  let upper = 0, lower = 0;
  for (const cat of window.YACHT_CATEGORIES) {
    const v = card[cat.id];
    if (v == null) continue;
    if (cat.section === "upper") upper += v;
    else lower += v;
  }
  const bonus = upper >= window.UPPER_BONUS_THRESHOLD ? window.UPPER_BONUS_VALUE : 0;
  return { upper, lower, bonus, grand: upper + bonus + lower };
};

window.allFilled = (card) => window.YACHT_CATEGORIES.every(c => card[c.id] != null);
