export type QuizQuestion = {
  prompt: string;
  options: string[];
  correct: number;
  explanation: string;
};

export const QUIZZES: Record<string, QuizQuestion[]> = {
  risk_percent: [
    {
      prompt:
        "Your account is $5,000. You decide to risk 1% per trade. What's the maximum dollar loss this trade should produce if your stop hits?",
      options: ["$5", "$50", "$500"],
      correct: 1,
      explanation:
        "1% of $5,000 = $50. That's the planned loss if the stop is hit — position size is set around that, not the other way around.",
    },
    {
      prompt: "Why is risking more than ~2% per trade considered dangerous for a beginner?",
      options: [
        "It always causes liquidation",
        "A few losing trades in a row can devastate the account",
        "Exchanges charge higher fees on bigger risk",
      ],
      correct: 1,
      explanation:
        "Survival is the point. 10 losses at 2% leaves 82% of the account; 10 at 20% leaves ~10%. Small risk per trade is how you stay in the game long enough to learn.",
    },
  ],

  stop_loss: [
    {
      prompt: "Where should the stop loss go on a long trade?",
      options: [
        "At a round number near the entry",
        "Just past the level your thesis is based on (e.g. below support)",
        "Wherever loses you no more than 0.1% of the account",
      ],
      correct: 1,
      explanation:
        "The stop marks where the idea is proven wrong on the chart — not a dollar amount picked at random. Position size adjusts so that distance equals your planned risk.",
    },
    {
      prompt: "A trade without a stop loss is best described as…",
      options: [
        "Safe as long as the leverage is low",
        "Fine if you can watch the chart actively",
        "A position you can't size, risk-manage, or review properly",
      ],
      correct: 2,
      explanation:
        "Without a stop you can't compute position size and you can't review the trade after the fact. It's the single most common way new traders blow up an account.",
    },
  ],

  take_profit: [
    {
      prompt: "Nearest resistance sits at $63,000. Where is a sensible take-profit?",
      options: ["$62,800 — just before resistance", "$63,500 — just past resistance", "$70,000 — round number"],
      correct: 0,
      explanation:
        "Price often rejects at major levels. Targeting just in front of the level converts more setups into actual closed winners than targeting past it.",
    },
    {
      prompt: "Why set a take-profit in advance rather than 'exit when it feels right'?",
      options: [
        "It guarantees the trade hits TP",
        "Without one, winners often reverse before you act",
        "Exchanges reward you for setting TPs",
      ],
      correct: 1,
      explanation:
        "Without a pre-decided exit, traders tend to ride winners back into losers. A defined TP turns a planned 2R win into an actual 2R win.",
    },
  ],

  risk_reward: [
    {
      prompt: "Entry $60,000. Stop $59,000. Take profit $63,000. What is the R:R?",
      options: ["1.0", "2.0", "3.0"],
      correct: 2,
      explanation: "Risk = $1,000. Reward = $3,000. R:R = 3,000 / 1,000 = 3.0.",
    },
    {
      prompt: "With an R:R of 2.0, what win rate do you need to break even (ignoring fees)?",
      options: ["~25%", "~33%", "~50%"],
      correct: 1,
      explanation:
        "Break-even win rate = risk / (risk + reward) = 1 / (1 + 2) ≈ 33%. Higher R:R lets you win without a high win rate.",
    },
  ],

  liquidation: [
    {
      prompt:
        "You go long at $60,000 with 10× leverage and no stop loss. Roughly how far does price need to fall to liquidate you?",
      options: ["~1%", "~10%", "~50%"],
      correct: 1,
      explanation:
        "At 10× leverage, a ~10% adverse move wipes out the posted margin and the exchange force-closes the position. Liquidation is worse than a stop — you typically lose the full margin plus fees.",
    },
    {
      prompt: "Why is liquidation worse than hitting a stop loss?",
      options: [
        "Liquidation refunds your fees",
        "You usually lose your full margin and can't recover even if price reverses",
        "Liquidations only happen on Tuesdays",
      ],
      correct: 1,
      explanation:
        "A stop is a planned exit at a chosen price. Liquidation is the exchange exiting for you at the worst moment, usually losing the entire margin posted on that position.",
    },
  ],

  leverage: [
    {
      prompt: "What does leverage actually control in your trade?",
      options: [
        "How much you can lose if your stop hits",
        "The distance between your entry and the liquidation price",
        "Your win rate",
      ],
      correct: 1,
      explanation:
        "Risk per trade is set by stop distance and risk %. Leverage decides how close liquidation sits — higher leverage = thinner buffer to liquidation.",
    },
    {
      prompt: "When does high leverage actually hurt you?",
      options: [
        "When the liquidation price sits inside your stop distance",
        "Whenever you take a long trade",
        "Only on weekends",
      ],
      correct: 0,
      explanation:
        "If liquidation would trigger before your stop, leverage is too high for that stop distance — the exchange exits before your plan does.",
    },
  ],

  support: [
    {
      prompt: "What turns a single price area into 'real' support?",
      options: [
        "The price ending in a round number",
        "Multiple successful touches where buyers stepped in",
        "A green candle anywhere on the chart",
      ],
      correct: 1,
      explanation:
        "Support gains weight with each successful retest. A single touch is a hint; multiple bounces with rejection is the signal.",
    },
    {
      prompt: "BTC has bounced off $59,500 three times this week. Where might your stop sit on a long entry above it?",
      options: ["At $59,500 exactly", "Just below $59,500 (e.g. $59,200)", "At $58,000"],
      correct: 1,
      explanation:
        "Stop sits just past the level your thesis depends on — close enough that R:R is healthy, far enough to survive normal noise.",
    },
  ],

  resistance: [
    {
      prompt: "Price has rejected $63,000 twice. What does this tell you about a long entered at $60,000?",
      options: [
        "Target $70,000 — break the level fast",
        "Realistic TP is just below $63,000, not above it",
        "Resistance no longer matters after the second rejection",
      ],
      correct: 1,
      explanation:
        "Targets in front of resistance fill more often than targets past it. Without a breakout thesis, plan for the rejection.",
    },
  ],

  trend: [
    {
      prompt: "Which sequence describes an uptrend?",
      options: [
        "Higher highs and higher lows",
        "Higher highs and lower lows",
        "Lower highs and higher lows",
      ],
      correct: 0,
      explanation:
        "Higher highs + higher lows = uptrend. Lower highs + lower lows = downtrend. Mixed = range or transition.",
    },
    {
      prompt: "Going short in a strong uptrend without strong confirmation is…",
      options: ["High edge", "Counter-trend — possible but lower probability", "Always profitable"],
      correct: 1,
      explanation:
        "Counter-trend trades work, but they need much stronger confirmation than trend-following ones. The replay tags this as 'Counter-trend' in the direction category.",
    },
  ],

  range: [
    {
      prompt: "Where is the edge inside a clean range?",
      options: ["At the middle", "At the edges — buy support, sell resistance", "Wherever momentum is strongest"],
      correct: 1,
      explanation:
        "In ranges, the edge is at the edges. Mid-range entries usually have worse stops and worse R:R than entries near the boundaries.",
    },
  ],

  breakout: [
    {
      prompt: "Which is generally the higher-quality entry on a breakout?",
      options: [
        "Buying the breakout candle near its high",
        "Waiting for a retest of the broken level and entering there",
        "Buying anywhere — it's already going",
      ],
      correct: 1,
      explanation:
        "A retest gives a much tighter stop than chasing the breakout candle, so R:R is dramatically better even at the same target.",
    },
    {
      prompt: "A clean break of resistance on 3× average volume is generally…",
      options: [
        "A real breakout candidate",
        "A fakeout — high volume is bearish",
        "Irrelevant — volume doesn't matter",
      ],
      correct: 0,
      explanation:
        "Breakouts on heavy volume tend to follow through. Breakouts on declining volume tend to fail.",
    },
  ],

  fakeout: [
    {
      prompt:
        "Range high is $63,000. A candle wicks to $63,400 then closes back at $62,700. What just happened?",
      options: ["Clean breakout", "Fakeout — breakout traders are trapped", "Trend reversal confirmed"],
      correct: 1,
      explanation:
        "Wicked above the level, closed back inside — that's a fakeout. Traders who chased the wick are now offside, and the reversal often runs back to range low.",
    },
  ],

  retest: [
    {
      prompt: "Why is a retest entry usually higher quality than chasing the breakout candle?",
      options: [
        "It pays a smaller exchange fee",
        "Stop is much tighter, so R:R is much better at the same target",
        "The trade always wins on a retest",
      ],
      correct: 1,
      explanation:
        "Retest entries sit close to the broken level — a tight stop just past it gives the same target with far better R:R than chasing the breakout high.",
    },
  ],

  liquidity_sweep: [
    {
      prompt: "Why do strong reversals often begin with a wick past an obvious high or low?",
      options: [
        "Coincidence — wicks are random",
        "Stops cluster there, and sweeping them fuels the move in the opposite direction",
        "Exchanges close trades randomly at obvious levels",
      ],
      correct: 1,
      explanation:
        "Obvious highs/lows are where retail stops sit. A sweep through them triggers those stops and provides liquidity for the reversal trade.",
    },
    {
      prompt: "Where is a smarter place for YOUR stop if you're long above support?",
      options: [
        "Exactly on the support line",
        "Just inside support (above the low)",
        "Just past support, outside the recent wick range",
      ],
      correct: 2,
      explanation:
        "Stops at the obvious level are exactly what gets swept. Place yours just past the level, outside the noise zone — the replay flags stops inside wick range as 'Stop inside noise'.",
    },
  ],

  entry: [
    {
      prompt: "Support is $59,500. Which entry gives the best R:R for a long targeting $61,500?",
      options: ["$59,600 (stop $59,200)", "$60,300 (stop $59,200)", "$60,800 (stop $59,200)"],
      correct: 0,
      explanation:
        "Reward $1,900 / Risk $400 → R:R ~4.75. Entering closer to the level dramatically improves the trade even when stop and target stay the same.",
    },
  ],

  thesis: [
    {
      prompt: "Which is an example of a usable trade thesis?",
      options: [
        "'It feels like it'll go up'",
        "'Uptrend on 4h, pulling back to $59,500 support that held twice — expecting continuation to $63,000'",
        "'I missed the last one'",
      ],
      correct: 1,
      explanation:
        "A real thesis names the setup, the level, and what you expect. If you can't articulate the trade, you can't review or improve it later.",
    },
  ],

  invalidation: [
    {
      prompt: "Which is a real invalidation?",
      options: [
        "'If it goes down'",
        "'4h close below $59,400 — breaks the uptrend structure and the bounce idea'",
        "'If I feel uncomfortable'",
      ],
      correct: 1,
      explanation:
        "Invalidation must be specific — a level, a structure, a behavior. 'Goes down' or 'feels bad' aren't levels; they're how losers become 'hold a bit longer'.",
    },
  ],

  target_realism: [
    {
      prompt:
        "Entry $60,000, nearest resistance at $63,000. Which take-profit is more realistic?",
      options: ["$62,800 — just before resistance", "$65,500 — well past resistance", "$70,000 — round number"],
      correct: 0,
      explanation:
        "Price tends to reject at major levels. TP just before resistance fills more often than TP past it; the replay flags TPs past the next level as 'Unrealistic target'.",
    },
  ],

  chasing: [
    {
      prompt:
        "You planned to long the retest of $63,000 breakout. Price ran to $63,950 instead. Best action?",
      options: [
        "Buy now at $63,950 — it's going",
        "Skip this entry — the trade is no longer the one you planned",
        "Use 50× leverage to catch up",
      ],
      correct: 1,
      explanation:
        "Chasing wrecks R:R. Skipping a missed setup keeps you ready for the next clean one — most accounts bleed from chases, not missed entries.",
    },
  ],

  wait_decision: [
    {
      prompt: "Conditions are choppy with no clean level nearby. What's the best decision?",
      options: [
        "Take a smaller position",
        "Wait — no setup is a real decision, not the absence of one",
        "Increase leverage to compensate",
      ],
      correct: 1,
      explanation:
        "Trading when nothing is there is one of the most common ways accounts bleed. The replay rewards correct waits with 'Wait was correct'.",
    },
  ],

  volatility: [
    {
      prompt: "Volatility just doubled. How should your position adapt?",
      options: [
        "Keep the same stop and size",
        "Tighten the stop and increase size",
        "Widen the stop and cut size, so dollar risk stays the same",
      ],
      correct: 2,
      explanation:
        "When candles get wider, a 0.5% stop will get wicked on noise. Widen the stop to fit the new range and shrink position size so risk per trade is unchanged.",
    },
  ],

  funding_rate: [
    {
      prompt: "BTC perp funding has been +0.10% every 8 hours for days. What does that imply?",
      options: [
        "Shorts are paying longs — bullish",
        "Longs are paying shorts — crowd is heavily long, often preceding a flush",
        "Funding has no signal value",
      ],
      correct: 1,
      explanation:
        "Positive funding means longs are paying shorts. Sustained high positive funding signals an overheated long-side trade — flushes often follow.",
    },
  ],

  // ─── Chart Tools quizzes (v4.0.1) ────────────────────────────────────────

  sma: [
    {
      prompt: "Last 5 closes are 100, 102, 98, 104, 106. What's the SMA(5)?",
      options: ["102", "104", "100"],
      correct: 0,
      explanation: "(100 + 102 + 98 + 104 + 106) / 5 = 102.",
    },
    {
      prompt: "Price is above its SMA(20). What does that tell you?",
      options: [
        "Price will keep going up",
        "Price is stronger than its recent average — short-term bullish bias",
        "It's time to short",
      ],
      correct: 1,
      explanation:
        "SMA shows you where price sits relative to its recent average — not where it's going. Above = bullish bias; doesn't predict the next candle.",
    },
  ],
  ema: [
    {
      prompt: "Why use an EMA instead of an SMA?",
      options: [
        "EMAs are always more accurate",
        "EMAs weight recent candles more, so they react faster to new price action",
        "EMAs don't lag at all",
      ],
      correct: 1,
      explanation:
        "EMAs give exponentially more weight to recent closes. They still lag price (all MAs do) but less than an SMA of the same period.",
    },
  ],
  key_mas: [
    {
      prompt: "Which three MA periods are most widely watched?",
      options: ["20, 50, 200", "10, 30, 100", "8, 21, 89"],
      correct: 0,
      explanation:
        "20 (short), 50 (medium), and 200 (long-term regime line) are the canonical periods every institutional trader watches.",
    },
  ],
  ma_crossover: [
    {
      prompt: "A 'death cross' is:",
      options: [
        "Price crossing below its 200 EMA",
        "The 50 MA crossing below the 200 MA",
        "The 20 MA crossing the 50 MA",
      ],
      correct: 1,
      explanation:
        "Death cross = 50 MA crosses BELOW 200 MA. Golden cross is the opposite. Both are lagging confirmation of a regime, not entry triggers.",
    },
  ],

  rsi: [
    {
      prompt: "RSI is at 78 inside a strong, multi-week uptrend. What's the right read?",
      options: [
        "Short immediately — overbought",
        "Confirmation the trend is real; fading it usually loses",
        "Ignore RSI in trends",
      ],
      correct: 1,
      explanation:
        "RSI can stay above 70 for weeks inside a strong trend. Fading 70+ readings in trends is one of the most common beginner traps.",
    },
    {
      prompt: "The default RSI period is:",
      options: ["7", "14", "21"],
      correct: 1,
      explanation: "Default RSI period is 14 candles. Standard across most platforms.",
    },
  ],
  macd: [
    {
      prompt: "What signal does the MACD histogram give when it crosses zero?",
      options: [
        "A momentum shift — bullish if crossing up through zero, bearish down",
        "A definite trend reversal",
        "Nothing useful",
      ],
      correct: 0,
      explanation:
        "Histogram crossing zero = the fast EMA has crossed the slow EMA. A momentum shift, not a guaranteed reversal — pair with structure for confirmation.",
    },
  ],
  stochastic: [
    {
      prompt: "Where does Stochastic Oscillator work best?",
      options: ["Strong trends", "Range-bound markets", "All markets equally"],
      correct: 1,
      explanation:
        "Stochastic shines in ranges where extremes mean reversion. In trends, it pegs at the extreme and stays there — useless.",
    },
  ],
  williams_r: [
    {
      prompt: "Williams %R reads above −20. What does that suggest?",
      options: ["Overbought", "Oversold", "Neutral"],
      correct: 0,
      explanation:
        "Williams %R is scaled −100 to 0. Above −20 = overbought; below −80 = oversold.",
    },
  ],
  divergence: [
    {
      prompt: "Price prints a new high, but RSI prints a LOWER high. What is that?",
      options: [
        "Bullish confirmation",
        "Bearish divergence — momentum is fading underneath the rally",
        "Random noise",
      ],
      correct: 1,
      explanation:
        "Classic bearish divergence: price extends but momentum doesn't confirm. Often precedes a pullback or reversal — but wait for a price trigger before acting.",
    },
  ],

  bollinger_bands: [
    {
      prompt: "Bands tighten dramatically after a long quiet period. What does that often precede?",
      options: ["A continuation of the quiet", "An explosive move (Bollinger squeeze)", "A guaranteed breakdown"],
      correct: 1,
      explanation:
        "Tight bands = low volatility. Volatility is mean-reverting; tight bands often precede expansion (the 'Bollinger squeeze'). Direction not predicted, just magnitude.",
    },
    {
      prompt: "Price tags the upper Bollinger band in a strong uptrend. What's the typical play?",
      options: ["Fade — sell the tag", "Don't fade — strong trends 'ride the band'", "Buy more"],
      correct: 1,
      explanation:
        "In trends, price can ride the band for many candles. Fading every tag is the textbook way to get chopped up in a real trend.",
    },
  ],
  atr: [
    {
      prompt: "ATR is $850 on BTC. You want a stop 1.5 ATR below entry. What's the stop distance?",
      options: ["$850", "$1,275", "$1,700"],
      correct: 1,
      explanation: "1.5 × $850 = $1,275 below entry.",
    },
  ],
  keltner: [
    {
      prompt: "What's the main difference between Keltner Channels and Bollinger Bands?",
      options: [
        "Keltner uses ATR around an EMA; Bollinger uses standard deviation around an SMA",
        "Keltner is faster than Bollinger",
        "There is no difference",
      ],
      correct: 0,
      explanation:
        "Keltner = ATR-based bands around an EMA. Bollinger = standard-deviation bands around an SMA. Keltner is smoother; less reactive to single-candle spikes.",
    },
  ],

  volume_profile: [
    {
      prompt: "What is the Point of Control (POC) on a Volume Profile?",
      options: [
        "The highest price in the range",
        "The price level with the most volume traded",
        "The most recent close",
      ],
      correct: 1,
      explanation:
        "POC = the price with the highest traded volume in the profile window. Acts as a magnet and a key support/resistance level.",
    },
  ],
  vwap: [
    {
      prompt: "Session VWAP is at $60,700. Price is at $60,500. What does that tell you?",
      options: [
        "Institutions are selling the asset above the day's average",
        "Price is below the day's average — slight intraday weakness",
        "VWAP has no meaning",
      ],
      correct: 1,
      explanation:
        "Price below session VWAP = intraday participants on average bought higher than current price. A common dynamic support/resistance reference.",
    },
  ],
  obv: [
    {
      prompt: "Price grinds higher but OBV is flat. What does that suggest?",
      options: [
        "Strong rally with conviction",
        "Rally lacks participation — fragile, often reverses",
        "OBV is broken",
      ],
      correct: 1,
      explanation:
        "Price rising + flat OBV = volume on down days roughly equals volume on up days. The rally has no real buying pressure underneath.",
    },
  ],
  cvd: [
    {
      prompt: "CVD is flat while price grinds up. What does that often indicate?",
      options: [
        "Aggressive buyers driving the move",
        "Short covering / drift rather than fresh buying — fragile",
        "Bullish breakout coming",
      ],
      correct: 1,
      explanation:
        "Flat CVD with rising price means market buys are matched by market sells; the move is drifting up because sellers stepped aside, not because buyers got aggressive. Often fades.",
    },
  ],

  fib_retracement: [
    {
      prompt: "Which Fibonacci level is the 'golden ratio' and most watched?",
      options: ["0.382", "0.5", "0.618"],
      correct: 2,
      explanation:
        "0.618 is the golden ratio retracement — the most-watched Fib level, often providing support in strong trends.",
    },
  ],
  fib_extension: [
    {
      prompt: "When is a Fib extension useful?",
      options: ["Setting a stop loss", "Finding profit targets beyond the swing high", "Drawing trend lines"],
      correct: 1,
      explanation: "Fib extensions project levels BEYOND the prior high, useful as objective profit targets.",
    },
  ],
  trend_line: [
    {
      prompt: "You keep redrawing your trend line every time price breaks it. What does that tell you?",
      options: [
        "Your line is too aggressive — keep adjusting",
        "The line isn't a real level — abandon it",
        "Trend lines always break",
      ],
      correct: 1,
      explanation:
        "If you're constantly adjusting a trend line, the original wasn't capturing a real level. Real trend lines hold multiple touches without redraw.",
    },
  ],
  channel: [
    {
      prompt: "Price breaks above the upper line of an uptrending channel on heavy volume. What's that often a signal of?",
      options: [
        "Definite top",
        "Acceleration — the start of a steeper trend",
        "Nothing — channels don't matter",
      ],
      correct: 1,
      explanation:
        "Channel breakouts on volume often kick off a steeper trend leg, as the prior boundary becomes the new floor.",
    },
  ],
  pitchfork: [
    {
      prompt: "What is the middle line of an Andrews' Pitchfork called?",
      options: ["The median line", "The trend line", "The pivot"],
      correct: 0,
      explanation: "Middle line = median. Often acts as a magnet for price inside the pitchfork.",
    },
  ],

  ichimoku: [
    {
      prompt: "Price is trading clearly above a thick green Ichimoku cloud. What does that signal?",
      options: ["Uptrend with strength behind it", "Imminent reversal", "Range condition"],
      correct: 0,
      explanation:
        "Above the cloud = uptrend; thick cloud = strong trend. The simplest Ichimoku read and the most useful for beginners.",
    },
  ],
  pivot_points: [
    {
      prompt: "Yesterday: H=$61,000, L=$59,000, C=$60,500. What is today's central pivot (P)?",
      options: ["$60,000", "$60,170", "$60,500"],
      correct: 1,
      explanation: "P = (H + L + C) / 3 = (61000 + 59000 + 60500) / 3 = $60,166.67 ≈ $60,170.",
    },
  ],
  donchian: [
    {
      prompt: "The classic Donchian breakout strategy says:",
      options: [
        "Buy a new 5-day high",
        "Buy a new 20-day high, sell a new 20-day low",
        "Only short breakouts",
      ],
      correct: 1,
      explanation:
        "Donchian's classic 20-day system: enter long on new 20-day highs, exit (or reverse short) on new 20-day lows. Trend-following bedrock since the 1950s.",
    },
  ],
  parabolic_sar: [
    {
      prompt: "Parabolic SAR dots are below price. What does that mean?",
      options: ["Uptrend in progress", "Downtrend in progress", "Trend has reversed"],
      correct: 0,
      explanation: "SAR dots below price = uptrend. They flip to above price when the trend reverses.",
    },
  ],
  super_guppy: [
    {
      prompt:
        "The Super Guppy ribbon goes solid blue (or solid green in standard mode). What is the chart telling you?",
      options: [
        "Time to buy at any price",
        "Every short EMA is above every long EMA — uptrend conviction",
        "The trend has just reversed from up to down",
      ],
      correct: 1,
      explanation:
        "Solid bull-color = full separation of the ribbons with shorts on top. It describes an existing uptrend, not a forward-looking signal. 'Time to buy at any price' would treat it as a signal it isn't.",
    },
    {
      prompt:
        "You see the Super Guppy ribbons interleaving — short and long lines crossing through each other. What's the read?",
      options: [
        "Strong uptrend, ignore the chop",
        "Strong downtrend, ignore the chop",
        "Trend in transition or absent — the ribbon isn't telling you anything actionable",
      ],
      correct: 2,
      explanation:
        "Interleaved ribbons = no clear trend. The 'mixed' state is honest: there isn't a directional signal until the ribbons separate again.",
    },
  ],
};

export function quizFor(termId: string): QuizQuestion[] | null {
  return QUIZZES[termId] ?? null;
}
