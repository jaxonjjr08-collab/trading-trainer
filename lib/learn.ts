import type { MistakeTag, SetupType } from "./types";

export type LearnCategory =
  | "risk_management"
  | "chart_reading"
  | "trade_planning"
  | "crypto_specific"
  // v4.0.1 — Chart tools: indicators and drawing tools. Distinct from
  // "Chart Reading" (which is structure: trend, range, support) — these
  // are the toolkit a trader layers on top of a chart to read it.
  | "chart_tools";

export const LEARN_CATEGORIES: { id: LearnCategory; label: string }[] = [
  { id: "risk_management", label: "Risk Management" },
  { id: "chart_reading", label: "Chart Reading" },
  { id: "chart_tools", label: "Chart Tools" },
  { id: "trade_planning", label: "Trade Planning" },
  { id: "crypto_specific", label: "Crypto-Specific" },
];

export const LEARN_CATEGORY_LABELS: Record<LearnCategory, string> = {
  risk_management: "Risk Management",
  chart_reading: "Chart Reading",
  chart_tools: "Chart Tools",
  trade_planning: "Trade Planning",
  crypto_specific: "Crypto-Specific",
};

export type LearnTerm = {
  id: string;
  term: string;
  category: LearnCategory;
  simpleDefinition: string;
  whyItMatters: string;
  example: string;
  commonMistake: string;
  replayScoringConnection: string;
  relatedTags: MistakeTag[];
};

export const LEARN_TERMS: LearnTerm[] = [
  // ---------- Risk Management ----------
  {
    id: "risk_percent",
    term: "Risk percent",
    category: "risk_management",
    simpleDefinition:
      "The percentage of your account you are willing to lose on a single trade if your stop loss is hit.",
    whyItMatters:
      "It's the single biggest control on how long you survive in the market. Pros usually risk 0.5%–2% per trade. Lose 10 in a row at 2% and you still have 82% of your account. Lose 10 in a row at 20% and you have ~10%.",
    example:
      "Account: $10,000\nRisk per trade: 1%\nMax loss allowed: $100\nIf entry is $60,000 and stop is $59,000, your position size is set so the move from $60,000 → $59,000 costs exactly $100.",
    commonMistake:
      "Deciding position size first, then setting a stop that happens to risk 8% of the account.",
    replayScoringConnection:
      "The risk category looks at your risk %. Going above ~2% triggers 'Risk too high'. Under 0.25% triggers 'Risk too low to learn'.",
    relatedTags: ["risk_too_high", "risk_too_low_to_learn"],
  },
  {
    id: "position_sizing",
    term: "Position sizing",
    category: "risk_management",
    simpleDefinition:
      "Calculating how big your position should be so that hitting your stop loss costs exactly your planned risk amount.",
    whyItMatters:
      "Position sizing translates a chart-based stop into a dollar amount. Get it wrong and a 'small' trade can quietly become an account-killer.",
    example:
      "Account: $10,000\nRisk: 1% = $100\nEntry: $60,000  Stop: $59,400 ($600 distance)\nPosition size = $100 / $600 = 0.166 BTC\nLeverage is just the tool that lets you control 0.166 BTC without holding $10,000 of it.",
    commonMistake:
      "Picking '$1,000 position with 10× leverage' without ever computing what hitting the stop actually loses.",
    replayScoringConnection:
      "Risk % and stop distance together determine position size in the scoring model. A wide stop with high risk % both hurts the risk score.",
    relatedTags: ["risk_too_high", "risk_too_low_to_learn"],
  },
  {
    id: "stop_loss",
    term: "Stop loss",
    category: "risk_management",
    simpleDefinition:
      "A pre-decided price where you exit a losing trade because your idea has been proven wrong.",
    whyItMatters:
      "A trade without a stop loss is a position you can't size, can't risk-manage, and can't review. This is the most common way new traders blow up.",
    example:
      "Long entry: $60,000\nThesis: bounce off $59,500 support\nStop loss: $59,200 (just below support — if price closes there, the bounce idea is wrong)\nThe stop is a level on the chart, not a dollar amount picked at random.",
    commonMistake:
      "Setting the stop right where everyone else's stop sits (just below the obvious low), so it gets swept on noise.",
    replayScoringConnection:
      "The stop category scores whether you placed one, whether it sits in noise, and whether it's too tight. No stop = 'No stop loss'.",
    relatedTags: ["no_stop_loss", "stop_too_tight", "stop_in_noise"],
  },
  {
    id: "take_profit",
    term: "Take profit",
    category: "trade_planning",
    simpleDefinition:
      "A pre-decided price where you exit a winning trade and lock in profit.",
    whyItMatters:
      "Without a target you tend to hold winners until they reverse — turning a 2R winner into a 0R scratch.",
    example:
      "Entry: $60,000\nNearest resistance: $63,000\nTake profit: $62,800 (just before the level, since price often rejects at resistance)\nReward: $2,800 per BTC.",
    commonMistake:
      "Picking a take-profit past the next major resistance instead of in front of it, then watching price reject and reverse.",
    replayScoringConnection:
      "The target category checks whether your take-profit sits before, near, or beyond major levels. Past the next level → 'Unrealistic target'.",
    relatedTags: ["tp_unrealistic"],
  },
  {
    id: "risk_reward",
    term: "Risk-to-reward",
    category: "risk_management",
    simpleDefinition:
      "The ratio between what you'd lose if your stop hits and what you'd make if your take-profit hits.",
    whyItMatters:
      "With R:R of 2.0 you only need ~33% of trades to break even. With R:R of 0.8 you need ~56% just to not lose money. R:R lets a beginner win without a high win rate.",
    example:
      "Entry: $60,000\nStop loss: $59,000\nTake profit: $63,000\nRisk: $1,000\nReward: $3,000\nR:R: 3.0",
    commonMistake:
      "Tight stop + small target right at the next candle = R:R of 0.7. Looks like a 'safe' trade but bleeds money over time.",
    replayScoringConnection:
      "The rr category measures (target − entry) / (entry − stop). Below ~1.5 triggers 'Poor risk-to-reward'.",
    relatedTags: ["poor_risk_reward"],
  },
  {
    id: "liquidation",
    term: "Liquidation",
    category: "risk_management",
    simpleDefinition:
      "When a leveraged position has lost so much that the exchange force-closes it because your margin is gone.",
    whyItMatters:
      "Liquidation is worse than a stop — you typically lose your full margin and pay extra fees. Once liquidated, you can't recover even if price comes back.",
    example:
      "Long 10× at $60,000 with no stop loss.\nLiquidation price ≈ $54,000 (a ~10% drop).\nIf you'd used 3× with a stop at $58,500, max loss would be a controlled 2.5% — not a wipeout.",
    commonMistake:
      "Stacking high leverage with no stop and hoping. The exchange exits the trade for you, at the worst possible price.",
    replayScoringConnection:
      "If estimated liquidation would trigger before your stop, the leverage category flags 'Liquidation before stop'.",
    relatedTags: ["liquidation_before_stop", "leverage_excessive"],
  },
  {
    id: "leverage",
    term: "Leverage",
    category: "risk_management",
    simpleDefinition:
      "A multiplier that lets you control a larger position with less capital. 10× means $1,000 controls $10,000 worth of asset.",
    whyItMatters:
      "Leverage does not change your risk per trade — your stop does. But it shrinks the buffer between price and liquidation. Higher leverage = liquidation closer to entry.",
    example:
      "Margin: $1,000  Leverage: 10×  Position: $10,000\nA 10% adverse move wipes the margin → liquidation.\nAt 3× the same move only costs ~30% of margin, and you survive.",
    commonMistake:
      "Treating leverage as 'free size'. Real risk is set by stop distance + risk %; leverage just decides whether you blow up before reaching your stop.",
    replayScoringConnection:
      "Leverage above ~20× triggers 'Leverage excessive'. Leverage that puts liquidation inside your stop triggers 'Liquidation before stop'.",
    relatedTags: ["leverage_excessive", "liquidation_before_stop"],
  },
  {
    id: "margin",
    term: "Margin",
    category: "risk_management",
    simpleDefinition:
      "The capital you post as collateral for a leveraged position. If price moves against you, losses come out of margin first.",
    whyItMatters:
      "Margin is what's actually at risk on the exchange. When margin runs out, you get liquidated.",
    example:
      "You open a $10,000 long with 10× leverage.\nMargin posted: $1,000.\nA 5% adverse move = $500 unrealized loss = half your margin gone.",
    commonMistake:
      "Confusing 'margin used' with 'risk per trade'. Margin is collateral; risk is what your stop loss says you'll actually lose.",
    replayScoringConnection:
      "Margin isn't scored directly, but together with leverage it determines liquidation distance — which is.",
    relatedTags: ["leverage_excessive", "liquidation_before_stop"],
  },
  {
    // v4.1 — new term for the portfolio simulator. Lives in risk_management
    // because the lesson — your total risk across all positions, not the
    // average — is structurally a risk-control concept.
    id: "portfolio_risk",
    term: "Portfolio risk",
    category: "risk_management",
    simpleDefinition:
      "The total risk across every open position you hold at the same time. Five trades risking 1% each is 5% portfolio risk — one bad day, not five small ones.",
    whyItMatters:
      "Per-trade risk caps how much one mistake costs. Portfolio risk caps how much one correlated event costs. If your five 'separate' trades are all longs on majors and the market dumps, they all hit stops together — that's 5% gone in one move, not 1%.",
    example:
      "Session budget: 5%.\nOpen: BTC long 1%, ETH long 1%, SOL long 1%, DOGE long 1%, LINK short 1%.\nBTC/ETH/SOL correlation > 0.7 — three of those five are effectively one trade. Real diversification needs a mix of directions or genuinely uncorrelated symbols.",
    commonMistake:
      "Treating each position's 1% as independent. If they share a market factor, your 'portfolio' is a leveraged version of that factor.",
    replayScoringConnection:
      "The portfolio_risk category (10 pts, simulator only) penalises total risk over 5% and same-direction overlap on high-correlation pairs.",
    relatedTags: ["portfolio_overconcentrated", "portfolio_correlated_overlap"],
  },

  // ---------- Chart Reading ----------
  {
    id: "support",
    term: "Support",
    category: "chart_reading",
    simpleDefinition:
      "A price area where buyers have stepped in before, causing price to bounce up.",
    whyItMatters:
      "Support gives you a logical place to look for longs and a logical place to put a stop (just below it).",
    example:
      "BTC bounced off $59,500 three times last week.\nLong entry idea: $59,600 on the next tap.\nStop: $59,200 — if support breaks, the idea is wrong.",
    commonMistake:
      "Treating a single touch as 'support'. Support gains weight with each successful retest.",
    replayScoringConnection:
      "The stop category rewards stops placed just outside support; placing a stop inside the wick range triggers 'Stop inside noise'.",
    relatedTags: ["stop_in_noise", "stop_too_tight"],
  },
  {
    id: "resistance",
    term: "Resistance",
    category: "chart_reading",
    simpleDefinition:
      "A price area where sellers have stepped in before, causing price to stall or reverse down.",
    whyItMatters:
      "Resistance tells you where longs tend to die and where shorts have an edge. Targets in front of resistance hit more often than targets past it.",
    example:
      "BTC has rejected $63,000 twice this month.\nLong entry at $60,000, take profit at $62,800 (just before resistance).\nDon't aim for $64,000 unless you have a breakout thesis.",
    commonMistake:
      "Setting take-profit beyond resistance and watching price reject right at the level.",
    replayScoringConnection:
      "Target placement is compared to nearby resistance. Past the next level → 'Unrealistic target'.",
    relatedTags: ["tp_unrealistic"],
  },
  {
    id: "trend",
    term: "Trend",
    category: "chart_reading",
    simpleDefinition:
      "The general direction of price over a meaningful window — higher highs and higher lows (up), or lower highs and lower lows (down).",
    whyItMatters:
      "Trading with the trend is the easiest edge in trading. Counter-trend trades work, but they require stronger confirmation and tighter management.",
    example:
      "Daily chart: BTC printed $58k → $61k → $60k → $63k → $62k.\nThat's an uptrend (higher highs and higher lows). Longs are with the trend; shorts are counter-trend.",
    commonMistake:
      "Shorting an obvious uptrend just because price 'looks high'.",
    replayScoringConnection:
      "Trading against trend without a strong setup triggers 'Counter-trend' in the direction category.",
    relatedTags: ["counter_trend"],
  },
  {
    id: "range",
    term: "Range",
    category: "chart_reading",
    simpleDefinition:
      "A market that's moving sideways between a clear support and resistance, with no sustained trend.",
    whyItMatters:
      "In ranges, the edge is at the edges: buy support, sell resistance. Trying to trend-trade chop is one of the fastest ways to bleed.",
    example:
      "ETH has bounced between $3,000 and $3,200 for two weeks.\nGood: long $3,020, target $3,180, stop $2,970.\nBad: chasing a 'breakout' that's actually just a normal range tag.",
    commonMistake:
      "Treating every push to range high as a breakout, getting long, then watching it fade right back into the middle.",
    replayScoringConnection:
      "Entries in the middle of a range usually score worse on entry and R:R than entries near the edges.",
    relatedTags: ["chasing_entry", "poor_risk_reward"],
  },
  {
    id: "htf_alignment",
    term: "HTF alignment",
    category: "chart_reading",
    simpleDefinition:
      "Reading the higher timeframe first (the HTF) before trading the lower one. When the two agree, signals are stronger; when they fight, the higher one usually wins.",
    whyItMatters:
      "Most failed entries come from reading the lower timeframe in isolation. A bullish flag on the 1h looks like a buy — until you zoom out and see it's a brief pause inside a six-week daily downtrend. The HTF tells you which way the wind is blowing; the LTF tells you when to step in.",
    example:
      "1h chart: BTC made a higher low at $58k, looks long.\n6h chart: price still inside the broader $57k–$60k range, supply zone at $59.5k overhead.\nThe HTF says any 1h long has resistance 1% away. Either take a smaller target, or wait for the HTF to resolve first.",
    commonMistake:
      "Trading the LTF setup as if the HTF doesn't exist — then wondering why a clean 1h pattern got chopped up by a 6h-level reversal.",
    replayScoringConnection:
      "Not scored directly, but counter-trend tags often fire when the LTF read ignored an obvious HTF trend in the opposite direction.",
    relatedTags: ["counter_trend"],
  },
  {
    id: "breakout",
    term: "Breakout",
    category: "chart_reading",
    simpleDefinition:
      "A move where price closes through a clear support or resistance level with momentum.",
    whyItMatters:
      "Real breakouts start trends. Fake breakouts trap traders who chased in. Distinguishing the two is one of the harder skills.",
    example:
      "BTC ranges between $60k and $63k for two weeks, then closes a 4h candle at $63,800 with strong volume.\nThat's a breakout. A retest near $63,000 is usually a higher-quality entry than chasing the breakout candle.",
    commonMistake:
      "Buying the breakout candle near its high. Stop is far away → R:R collapses → fake breakout liquidates you.",
    replayScoringConnection:
      "Entry placed far above the level → 'Chasing entry'. The wide stop usually also produces 'Poor risk-to-reward'.",
    relatedTags: ["chasing_entry", "poor_risk_reward"],
  },
  {
    id: "fakeout",
    term: "Fakeout",
    category: "chart_reading",
    simpleDefinition:
      "Price briefly breaks a level, traps breakout traders, then reverses back inside the range.",
    whyItMatters:
      "Fakeouts are how the market punishes traders who don't wait for confirmation. Recognizing one early gives you one of the cleanest setups: trade the reversal.",
    example:
      "Range high: $63,000. Price wicks to $63,400 then closes the candle back at $62,700.\nThat wick is a fakeout. A short at the close, stop above the wick, target back at range low, is often R:R 2–3.",
    commonMistake:
      "Buying the wick because 'it broke out', then getting stopped as the candle closes back inside.",
    replayScoringConnection:
      "Buying into a fakeout typically scores poorly on direction (counter-trend relative to the failed move) and triggers 'Chasing entry'.",
    relatedTags: ["chasing_entry", "counter_trend"],
  },
  {
    id: "retest",
    term: "Retest",
    category: "chart_reading",
    simpleDefinition:
      "After a breakout, price comes back to the broken level and uses it as support (or resistance) before continuing.",
    whyItMatters:
      "Retest entries usually give a much better stop placement than chasing the breakout candle — tighter stop, same target, better R:R.",
    example:
      "BTC breaks $63,000 and runs to $63,800.\nA few hours later it pulls back to $63,050.\nLong $63,100, stop $62,800, target $64,500. R:R ~4.5.",
    commonMistake:
      "Refusing to wait for the retest and chasing the breakout candle instead.",
    replayScoringConnection:
      "A retest entry near the level usually scores well on entry and R:R. A chase scores poorly on both.",
    relatedTags: ["chasing_entry"],
  },
  {
    id: "liquidity_sweep",
    term: "Liquidity sweep",
    category: "chart_reading",
    simpleDefinition:
      "A move that pokes just past an obvious high or low — where everyone's stops sit — then sharply reverses.",
    whyItMatters:
      "Many strong moves start with a sweep of the opposite side's stops. Putting your own stop right at the obvious level means you fund those moves.",
    example:
      "Range low: $59,500. Price wicks to $59,300 (sweeping stops), then reverses up to $61,000.\nIf your stop was at $59,490, you were the liquidity.",
    commonMistake:
      "Placing the stop at the obvious low/high instead of just outside the noise zone.",
    replayScoringConnection:
      "Stops inside recent wick ranges trigger 'Stop inside noise' in the stop category.",
    relatedTags: ["stop_in_noise"],
  },

  // ---------- Trade Planning ----------
  {
    id: "entry",
    term: "Entry",
    category: "trade_planning",
    simpleDefinition:
      "The price at which you open the position. The chosen entry directly sets your stop distance and R:R.",
    whyItMatters:
      "A great setup with a bad entry becomes a mediocre trade. A few dollars closer to the level often doubles the R:R.",
    example:
      "Support: $59,500.\nGood entry: $59,600 (stop $59,200, target $61,500 → R:R ~4.75).\nLate entry: $60,300 (stop $59,200, target $61,500 → R:R ~1.1).",
    commonMistake:
      "Entering wherever price is right now instead of at a planned level.",
    replayScoringConnection:
      "The entry category compares your entry to the nearest level. Far from the level → 'Chasing entry'.",
    relatedTags: ["chasing_entry"],
  },
  {
    id: "thesis",
    term: "Thesis",
    category: "trade_planning",
    simpleDefinition:
      "A short, written reason for taking the trade. One or two sentences that name the setup and what you expect.",
    whyItMatters:
      "If you can't articulate why you're entering, you can't review the trade later, and you can't tell whether you got better or just got lucky.",
    example:
      "'BTC is in an uptrend on the 4h. Pulling back to $59,500 support, which held twice this week. Going long expecting a continuation to $63,000 resistance.'",
    commonMistake:
      "Entering because 'it feels like it'll go up', then having nothing to learn from when the trade closes.",
    replayScoringConnection:
      "Empty thesis → 'Missing thesis' in the thesis category, and zero points there.",
    relatedTags: ["no_thesis"],
  },
  {
    id: "invalidation",
    term: "Invalidation",
    category: "trade_planning",
    simpleDefinition:
      "A specific condition that would prove the trade idea wrong — usually a level or behavior, not just a price.",
    whyItMatters:
      "Writing the invalidation forces you to be honest about when to exit. Without it, losers become 'just one more candle'.",
    example:
      "Trade: long $60,000 expecting continuation.\nInvalidation: '4h close below $59,400 — that breaks the uptrend structure and the bounce idea is dead.'",
    commonMistake:
      "Writing 'if it goes down' as the invalidation. That's not a level; it's a feeling.",
    replayScoringConnection:
      "Empty invalidation → 'Missing invalidation' in the invalidation category, and zero points there.",
    relatedTags: ["no_invalidation"],
  },
  {
    id: "target_realism",
    term: "Target realism",
    category: "trade_planning",
    simpleDefinition:
      "Whether your take-profit is achievable in the current structure — or sits past the next major level price tends to react at.",
    whyItMatters:
      "Ambitious targets feel good but rarely fill. A realistic target turns more setups into actual closed winners.",
    example:
      "Entry $60,000.\nNext resistance: $63,000.\nRealistic TP: $62,800.\nUnrealistic TP: $65,500 (price has to chew through resistance first).",
    commonMistake:
      "Setting a TP at a round number well past the next level because 'that's where I want it to go'.",
    replayScoringConnection:
      "TP past the next level → 'Unrealistic target' in the target category.",
    relatedTags: ["tp_unrealistic"],
  },
  {
    id: "chasing",
    term: "Chasing",
    category: "trade_planning",
    simpleDefinition:
      "Entering well after price has moved away from a defined level, usually out of fear of missing out.",
    whyItMatters:
      "Chasing entries pay worse stops, worse R:R, and worse emotional decisions. Most 'this trade just isn't working' losses start with a chase.",
    example:
      "Plan: long the retest of $63,000 breakout.\nReality: didn't enter at $63,050, instead bought $63,950 'because it's running'.\nNow the natural stop is $1,000 away instead of $200.",
    commonMistake:
      "Treating 'price is going up' as confirmation. Real confirmation is structure, not momentum on the entry candle.",
    replayScoringConnection:
      "Entry far from the relevant level → 'Chasing entry'. R:R also usually collapses, compounding the score hit.",
    relatedTags: ["chasing_entry", "poor_risk_reward"],
  },
  {
    id: "wait_decision",
    term: "Wait decision",
    category: "trade_planning",
    simpleDefinition:
      "Choosing not to trade when conditions don't meet your criteria. A real decision — not the absence of one.",
    whyItMatters:
      "Most accounts bleed from forced trades in poor conditions, not from missing the perfect setup. 'Wait' is sometimes the highest-edge action available.",
    example:
      "Chop between $60,000 and $60,300, no clean level nearby, news event in 20 minutes.\nWait. Same setup tomorrow, but cleaner, is a much better trade.",
    commonMistake:
      "Trading because you opened the app, not because the chart deserved a trade.",
    replayScoringConnection:
      "Waiting in poor conditions is rewarded with the 'Wait was correct' tag. Trading in those conditions can earn 'Forced trade'.",
    relatedTags: ["wait_was_best", "forced_trade", "missed_valid_setup"],
  },
  {
    id: "trade_management",
    term: "Trade management",
    category: "trade_planning",
    simpleDefinition:
      "How you behave between entry and exit: moving the stop, scaling, or doing nothing.",
    whyItMatters:
      "Most trades are won or lost after entry. The plan-then-leave-it-alone approach beats most active management in the early years.",
    example:
      "After entry at $60,000 with stop $59,200 and TP $63,000:\nDo not move the stop down because price wiggled. Do not close early at $61,000 'just in case'. Let the original plan resolve.",
    commonMistake:
      "Moving the stop further away after entry to 'give it room'. That just turns the planned 1% loss into a 3% loss.",
    replayScoringConnection:
      "Trade management isn't scored directly in v1, but it's the next layer on top of the plan you submit.",
    relatedTags: ["no_stop_loss"],
  },

  // ---------- Crypto-Specific ----------
  {
    id: "funding_rate",
    term: "Funding rate",
    category: "crypto_specific",
    simpleDefinition:
      "Periodic payment exchanged between longs and shorts on perpetual futures, designed to keep the perp price near spot.",
    whyItMatters:
      "Extreme funding shows crowd positioning. Very high positive funding means longs are paying a lot — often a sign of an overheated long-side trade.",
    example:
      "BTC perp funding is +0.10% every 8 hours = ~110% per year.\nLongs are paying shorts. Crowd is heavily long. A flush in price often follows.",
    commonMistake:
      "Going long because price keeps going up, while funding is screaming that the trade is already over-positioned.",
    replayScoringConnection:
      "Not scored directly, but funding context often appears in scenario notes and shapes whether the setup is high- or low-quality.",
    relatedTags: ["chasing_entry"],
  },
  {
    id: "open_interest",
    term: "Open interest",
    category: "crypto_specific",
    simpleDefinition:
      "The total number of open futures contracts in the market. Rising OI = new positions being opened; falling OI = positions being closed.",
    whyItMatters:
      "Price + OI tells you what kind of move it is. Price up + OI up = new longs opening. Price up + OI down = shorts covering.",
    example:
      "BTC pumps 3% and OI rises 5% — new longs piling in. If price reverses, those new longs become forced sellers, often causing a fast flush.",
    commonMistake:
      "Treating a pump as bullish without checking whether OI is rising (fragile) or falling (squeezed shorts being closed).",
    replayScoringConnection:
      "Not scored directly. Used to frame setup quality in scenario context.",
    relatedTags: [],
  },
  {
    id: "long_short_ratio",
    term: "Long/short ratio",
    category: "crypto_specific",
    simpleDefinition:
      "A measure of how positioned the market is — total open longs vs total open shorts.",
    whyItMatters:
      "When a ratio is extreme, the crowd is leaning one way. Price often punishes the heavier side via a liquidation cascade.",
    example:
      "Long/short ratio: 3.2 (very long-heavy).\nA modest sell-off can cascade into liquidations of those longs, accelerating the move.",
    commonMistake:
      "Joining the heaviest side late, right before the liquidation cascade against it.",
    replayScoringConnection:
      "Not scored directly. Helps frame whether a trade is with the crowd at extreme positioning or against it.",
    relatedTags: [],
  },
  {
    id: "liquidation_clusters",
    term: "Liquidation clusters",
    category: "crypto_specific",
    simpleDefinition:
      "Price zones where many leveraged positions would get liquidated. Price is often drawn toward them.",
    whyItMatters:
      "Liquidation zones act like magnets in volatile markets. Knowing where the obvious clusters are tells you where price 'wants' to wick.",
    example:
      "Heavy long liquidations cluster at $58,500. Spot is $60,000.\nA sweep to $58,400 wicking those liquidations, then reversing, is a very common pattern.",
    commonMistake:
      "Placing a stop right on the obvious cluster, then watching price wick exactly there.",
    replayScoringConnection:
      "Stops placed inside obvious wick zones trigger 'Stop inside noise'.",
    relatedTags: ["stop_in_noise", "liquidation_before_stop"],
  },
  {
    id: "volume",
    term: "Volume",
    category: "crypto_specific",
    simpleDefinition:
      "How much was traded over a given period. High volume = strong conviction; low volume = thin participation.",
    whyItMatters:
      "Breakouts on high volume tend to follow through. Breakouts on declining volume tend to fail.",
    example:
      "BTC breaks $63,000 on a 4h candle with 3× the average 4h volume — that's a real breakout candidate.\nSame break on 0.5× volume = much more likely a fakeout.",
    commonMistake:
      "Treating any close beyond a level as a breakout, regardless of volume.",
    replayScoringConnection:
      "Not scored directly, but volume context shapes whether a setup is treated as a breakout, fakeout, or chop in scenario design.",
    relatedTags: ["chasing_entry"],
  },
  {
    id: "volatility",
    term: "Volatility",
    category: "crypto_specific",
    simpleDefinition:
      "How much price moves around. Higher volatility = wider candles, wider stops needed, smaller position sizes.",
    whyItMatters:
      "Position size must adapt to volatility. In a quiet market a 1% stop is normal. In a wild market the same stop will get hit on noise.",
    example:
      "Quiet day: stop 0.5% away is fine.\nNews day: same stop gets wicked in 5 minutes. Use a 1.5% stop and cut size by 3× to keep risk constant.",
    commonMistake:
      "Using the same stop distance and size on a quiet day and a CPI release day.",
    replayScoringConnection:
      "Stops that are too tight relative to recent candle range trigger 'Stop too tight'.",
    relatedTags: ["stop_too_tight", "stop_in_noise"],
  },
  {
    id: "slippage",
    term: "Slippage",
    category: "crypto_specific",
    simpleDefinition:
      "The difference between the price you wanted and the price you actually got. Worse during fast moves and thin books.",
    whyItMatters:
      "Slippage silently degrades R:R. A stop 'at $59,000' that fills at $58,820 turned a planned 1R loss into 1.3R.",
    example:
      "Market sell during a flash crash. Intended exit $59,000. Actual fill: $58,750. That 0.4% of slippage is real lost capital.",
    commonMistake:
      "Using market orders in thin liquidity. Limit orders give you a price; market orders give you whatever's there.",
    replayScoringConnection:
      "Slippage isn't scored, but assuming perfect fills in your plan is a common reason real results lag the simulator.",
    relatedTags: [],
  },

  // ─── Chart Tools (v4.0.1) ─────────────────────────────────────────────────
  // Indicators and drawing tools layered on top of the chart. Distinct from
  // structure terms (trend, range, support) which describe what price IS;
  // these describe tools you USE to read price.

  // Moving averages (4)
  {
    id: "sma",
    term: "Simple Moving Average (SMA)",
    category: "chart_tools",
    simpleDefinition:
      "The arithmetic average of the last N closes. SMA(20) is the average of the most recent 20 candles' closing prices.",
    whyItMatters:
      "Smooths short-term noise so the underlying trend is easier to read. Above the SMA = price stronger than recent average; below = weaker. Common periods: 20 (short), 50 (medium), 200 (long).",
    example:
      "Last 5 closes: 60, 61, 59, 62, 63.\nSMA(5) = (60+61+59+62+63) / 5 = 61.\nIf today's close is 63, price is 2 above the SMA — short-term bullish.",
    commonMistake:
      "Treating an SMA crossover as a standalone signal. SMA tells you where price is relative to the average; it doesn't tell you where price is going next.",
    replayScoringConnection:
      "Not scored directly in v4.0.x. v4.0.3 may reward a thesis that names an SMA when the chart shows one.",
    relatedTags: [],
  },
  {
    id: "ema",
    term: "Exponential Moving Average (EMA)",
    category: "chart_tools",
    simpleDefinition:
      "A moving average that weights recent candles more than older ones. Reacts faster than the SMA to new price information.",
    whyItMatters:
      "Real markets care about what just happened more than what happened 20 candles ago. EMA captures that by giving exponentially more weight to recent closes. The 20 EMA is the most-watched short-term reference on crypto charts.",
    example:
      "EMA(20) on BTC sitting at $60,500. Price holds above on a pullback to $60,800 and resumes higher — that's a textbook 'EMA holding as dynamic support' trade.",
    commonMistake:
      "Picking too short an EMA (5, 8) and treating every cross as a signal. Short EMAs are noisy; pick the period to match your timeframe and let it breathe.",
    replayScoringConnection:
      "Not scored directly in v4.0.x.",
    relatedTags: [],
  },
  {
    id: "key_mas",
    term: "Key MAs (20 / 50 / 200)",
    category: "chart_tools",
    simpleDefinition:
      "Three moving averages most institutional traders watch. 20 = short-term trend, 50 = medium, 200 = long-term and the bull/bear dividing line.",
    whyItMatters:
      "These numbers are self-fulfilling: enough traders watch them that they become real support/resistance. Price reclaiming or losing the 200 day moving average gets headlines for a reason — it shifts the long-term regime.",
    example:
      "Price above all three (20 > 50 > 200) = clean uptrend. Price below all three = clean downtrend. Mixed (e.g. above 20 but below 200) = chop or transition.",
    commonMistake:
      "Using exotic periods (37, 89) instead of the canonical ones. The whole point of these MAs is that they're widely watched; obscure periods give you no edge.",
    replayScoringConnection:
      "Not scored directly.",
    relatedTags: [],
  },
  {
    id: "ma_crossover",
    term: "MA crossover (golden / death cross)",
    category: "chart_tools",
    simpleDefinition:
      "When a faster MA crosses a slower one. Golden cross = 50 crosses above 200 (bullish). Death cross = 50 crosses below 200 (bearish).",
    whyItMatters:
      "A lagging confirmation of a regime change. By the time the cross prints, the trend has often been running for weeks. Useful as a frame, terrible as an entry trigger.",
    example:
      "BTC's 50 day EMA crosses above its 200 day in late 2023. The 'golden cross' arrives weeks into a rally that's already 30% off the lows.",
    commonMistake:
      "Buying the candle of the cross. Most of the move that produced the cross is already behind you.",
    replayScoringConnection:
      "Not scored.",
    relatedTags: [],
  },

  // Momentum oscillators (5)
  {
    id: "rsi",
    term: "RSI (Relative Strength Index)",
    category: "chart_tools",
    simpleDefinition:
      "A 0–100 momentum oscillator. Above 70 = overbought, below 30 = oversold. Default period: 14 candles.",
    whyItMatters:
      "Quantifies whether recent price action is unusually strong or weak. In ranges, RSI hits extremes and reverses; in trends, RSI can stay overbought for weeks without selling off.",
    example:
      "BTC tags 75 on the daily RSI after a 20% run. In a range, that's a fade signal. In a strong trend, it's just confirmation the trend is real — fading it is the trap.",
    commonMistake:
      "Shorting just because RSI > 70. RSI in a strong trend is a momentum reading, not a reversal signal. Pair it with structure (a clear lower high) before acting on it.",
    replayScoringConnection:
      "Not scored directly.",
    relatedTags: [],
  },
  {
    id: "macd",
    term: "MACD",
    category: "chart_tools",
    simpleDefinition:
      "Moving Average Convergence Divergence. Two lines (12 EMA minus 26 EMA, and a 9-period EMA of that) plus a histogram showing the difference. Tracks momentum changes.",
    whyItMatters:
      "MACD turning up while still negative often catches the early part of a recovery before price confirms. The histogram crossing zero is a cleaner momentum-shift signal than the line crossover (which is slower).",
    example:
      "After a multi-week downtrend, the MACD histogram prints its first green bar in months while price is still near the lows. Often an early bottom signal — confirmed when price makes a higher low.",
    commonMistake:
      "Trading every line crossover. The crossover lags; you'll buy the top of bounces and sell the bottom of dips.",
    replayScoringConnection:
      "Not scored directly.",
    relatedTags: [],
  },
  {
    id: "stochastic",
    term: "Stochastic Oscillator",
    category: "chart_tools",
    simpleDefinition:
      "Compares the latest close to the recent high-low range. Scaled 0–100. Above 80 = overbought, below 20 = oversold. Two lines (fast %K and slow %D) cross like MACD.",
    whyItMatters:
      "More sensitive than RSI to recent action. Useful in range-bound markets where extremes mean reversion. Useless in trends; it pegs at the extreme and stays there.",
    example:
      "ETH ranging between $3,000 and $3,200 for two weeks. Stochastic at 85 with price at $3,190 = good fade. Stochastic at 85 with price breaking out at $3,250 = ignore it, trend is starting.",
    commonMistake:
      "Using stochastic on trending charts. It will scream 'overbought' for the entire move up while price keeps going.",
    replayScoringConnection:
      "Not scored directly.",
    relatedTags: [],
  },
  {
    id: "williams_r",
    term: "Williams %R",
    category: "chart_tools",
    simpleDefinition:
      "A momentum oscillator that scores the close against the recent high-low range, scaled from −100 (close = recent low) to 0 (close = recent high). Above −20 = overbought, below −80 = oversold. Same idea as Stochastic, slightly faster to react.",
    whyItMatters:
      "Pairs well with RSI or Stochastic as a confirmation indicator. If all three flash overbought at the same price, the signal is much stronger than any one alone — Williams %R is usually the first to flip, so it's the leading edge of the trio.",
    example:
      "BTC near the top of a range. Williams %R hits −5 (very overbought). RSI hits 78. Stochastic hits 88. All three agreeing on 'too far, too fast' at the same price is a higher-quality fade than any single oscillator screaming on its own.",
    commonMistake:
      "Treating it as a standalone signal. In a strong trend, Williams %R can sit at −10 for days and price keeps going — you'll burn money shorting just because one indicator says overbought. Always pair with structure (a clear lower high) or another oscillator.",
    replayScoringConnection:
      "Not scored directly.",
    relatedTags: [],
  },
  {
    id: "divergence",
    term: "Divergence (price vs. oscillator)",
    category: "chart_tools",
    simpleDefinition:
      "Price makes a new high (or low) but the oscillator doesn't. Bullish: price lower low, oscillator higher low. Bearish: price higher high, oscillator lower high.",
    whyItMatters:
      "One of the few momentum signals that actually leads price. The oscillator failing to confirm a new extreme means momentum is fading underneath. Doesn't tell you when, only that the existing move is getting tired.",
    example:
      "BTC prints a new ATH at $73k. RSI on the daily peaks at 68, well below its prior high of 84. Classic bearish divergence — the rally is running on fumes. A pullback or full reversal often follows within days.",
    commonMistake:
      "Acting on divergence alone without a price trigger. Trends can show divergence for months before reversing. Wait for the structural break (lower high, broken trend line) before sizing in.",
    replayScoringConnection:
      "Not scored directly.",
    relatedTags: [],
  },

  // Volatility (3)
  {
    id: "bollinger_bands",
    term: "Bollinger Bands",
    category: "chart_tools",
    simpleDefinition:
      "A middle moving average (usually SMA(20)) with upper and lower bands placed 2 standard deviations away. Bands expand when volatility rises, contract when it falls.",
    whyItMatters:
      "Visualises 'how unusual is this price right now.' Tags of the upper band in a range = fade candidate. Bands squeezing tight after a long quiet period often precede an explosive move (the 'Bollinger squeeze').",
    example:
      "BTC chops between $58k and $60k for two weeks while the bands tighten dramatically. The squeeze breaks with a $61.5k close — that's the breakout signal. Bands often expand violently on the move.",
    commonMistake:
      "Selling every tag of the upper band. In a strong trend, price 'rides the band' for many candles; fading it is exactly the wrong play.",
    replayScoringConnection:
      "Not scored directly.",
    relatedTags: [],
  },
  {
    id: "atr",
    term: "ATR (Average True Range)",
    category: "chart_tools",
    simpleDefinition:
      "Average size of the last N candles' true range (high minus low, adjusted for gaps). Measures recent volatility in price units, not percent.",
    whyItMatters:
      "Used for sizing stops. A stop at '1 ATR below entry' adapts to volatility automatically — wider in volatile periods, tighter when the chart is quiet. Beats hand-picked dollar amounts.",
    example:
      "ATR(14) on BTC 6h = $850. A stop placed 1.5 ATR below entry is at entry − $1,275. In a quieter market with ATR $400, the same 1.5 ATR stop sits at entry − $600.",
    commonMistake:
      "Using a fixed-dollar stop in all conditions. In high vol, it gets wicked; in low vol, it's overly generous and reduces R:R.",
    replayScoringConnection:
      "Not scored directly.",
    relatedTags: ["stop_too_tight"],
  },
  {
    id: "keltner",
    term: "Keltner Channels",
    category: "chart_tools",
    simpleDefinition:
      "Bands around an EMA, with width based on ATR (Average True Range) rather than standard deviation. Looks like Bollinger Bands but reacts more slowly to single wild candles, so the bands stay where they 'should be' during normal trends.",
    whyItMatters:
      "Because ATR is a smoothed volatility measure, one outlier candle doesn't blow the bands out the way it does on Bollinger. That makes Keltner a cleaner reference for trend-continuation entries — the bands don't lie to you on news spikes.",
    example:
      "BTC prints one huge red candle on bad news. Bollinger bands explode outward (the std-dev calc treats that candle as a structural change); Keltner bands barely budge (ATR smooths the spike out). Next day, price retraces back inside Bollinger's now-wide bands (looks like 'all fine') but is still pressing Keltner's tighter upper rail (the trend is still under real pressure).",
    commonMistake:
      "Stacking Bollinger AND Keltner on the same chart. They tell similar stories; two envelopes is visual noise. Pick one and learn it deeply.",
    replayScoringConnection:
      "Not scored directly.",
    relatedTags: [],
  },

  // Volume-based (4)
  {
    id: "volume_profile",
    term: "Volume Profile + Point of Control",
    category: "chart_tools",
    simpleDefinition:
      "A horizontal histogram showing how much was traded at each price. Point of Control (POC) is the price with the highest volume.",
    whyItMatters:
      "Tells you where the consensus prices are. High-volume nodes act as support (price keeps returning there). Low-volume nodes act as 'air' — price moves through them quickly with little resistance.",
    example:
      "Volume Profile on BTC 1d over the last 30 days shows a thick high-volume node at $59-60k (POC = $59,500). Below that: thin volume until $54k. A breakdown of $59k will often air-drop quickly to $54k.",
    commonMistake:
      "Reading Volume Profile in isolation. It tells you where, not when — pair with structure or momentum for entries.",
    replayScoringConnection:
      "Not scored directly.",
    relatedTags: [],
  },
  {
    id: "vwap",
    term: "VWAP (Volume-Weighted Average Price)",
    category: "chart_tools",
    simpleDefinition:
      "The day's average price weighted by volume. Resets every session (or week, or anchor point).",
    whyItMatters:
      "The reference price institutional traders use for execution. Price above session VWAP = institutions are buying above average; price below = selling below. Often acts as dynamic support/resistance intraday.",
    example:
      "BTC opens the session at $60k, runs to $61.5k, pulls back to $60.5k. Session VWAP sits at $60.7k. The pullback that holds VWAP and bounces is the textbook intraday long entry.",
    commonMistake:
      "Using daily VWAP on a 1d chart. VWAP is fundamentally an intraday tool; on the daily it's just a slow MA of dubious utility.",
    replayScoringConnection:
      "Not scored directly.",
    relatedTags: [],
  },
  {
    id: "obv",
    term: "OBV (On-Balance Volume)",
    category: "chart_tools",
    simpleDefinition:
      "A running total: add the period's volume on up candles, subtract on down candles. Direction matters, not absolute value.",
    whyItMatters:
      "Reveals whether volume is following price. Price rising + OBV rising = participation is real. Price rising + OBV flat or falling = rally on weak hands; reversal risk.",
    example:
      "BTC grinds from $58k to $60k over two weeks. OBV goes nowhere — volume on down days roughly matches volume on up days. The rally has no conviction; a flush back to $56k often follows.",
    commonMistake:
      "Reading the absolute number. OBV's scale is arbitrary; only the slope vs. price matters.",
    replayScoringConnection:
      "Not scored directly.",
    relatedTags: [],
  },
  {
    id: "cvd",
    term: "CVD (Cumulative Volume Delta)",
    category: "chart_tools",
    simpleDefinition:
      "A running total of buy volume minus sell volume — specifically, aggressive orders that lifted the offer (buys) versus aggressive orders that hit the bid (sells). Rising = buyers pressing; falling = sellers pressing.",
    whyItMatters:
      "Tells you WHO is moving the price. Price up + CVD up = real buying pressure with conviction. Price up + CVD flat or down = price drifting because no one's selling, not because anyone's buying. The first is durable; the second usually unwinds.",
    example:
      "BTC grinds from $60k to $62k over a week. CVD is flat the whole way. That's not aggressive buying — it's a short squeeze unwinding, with sellers covering rather than new longs stepping in. When the squeeze ends, price often comes right back to $60k.",
    commonMistake:
      "Reading CVD on one exchange and assuming it represents the whole market. Different venues see different order flow; a bearish divergence on one venue might not match aggregate behaviour. Use the biggest-volume venue available.",
    replayScoringConnection:
      "Not scored directly.",
    relatedTags: [],
  },

  // Drawing tools (5)
  {
    id: "fib_retracement",
    term: "Fibonacci Retracement",
    category: "chart_tools",
    simpleDefinition:
      "Horizontal levels drawn between a swing high and swing low at the ratios 0.236, 0.382, 0.5, 0.618, 0.786. Marks where pullbacks tend to find support.",
    whyItMatters:
      "Enough traders watch these ratios that they become self-fulfilling support/resistance levels. The 0.618 ('golden ratio') is the most-watched; pullbacks to it inside a strong trend are textbook entries.",
    example:
      "BTC ran from $55k (swing low) to $65k (swing high). The 0.618 retracement sits at $58,820. A bounce off that level inside the broader uptrend is a high-EV long entry with stop just below.",
    commonMistake:
      "Treating Fib levels as exact prices. They're zones — a wick a few percent below the 0.618 can still hold the level. Plan for it.",
    replayScoringConnection:
      "Not scored directly.",
    relatedTags: [],
  },
  {
    id: "fib_extension",
    term: "Fibonacci Extension",
    category: "chart_tools",
    simpleDefinition:
      "Fib levels projected BEYOND the swing high, used to find profit targets. Common extensions: 1.272, 1.414, 1.618, 2.0.",
    whyItMatters:
      "Once a trade is working, Fib extensions give you objective profit targets that aren't 'wherever feels right.' The 1.618 extension is the most common target in trend-continuation trades.",
    example:
      "Same BTC move from $55k to $65k. The 1.618 extension sits at $71,180. After a pullback to $58k that bounces, a long with TP at $71k uses the extension as the target rather than guessing.",
    commonMistake:
      "Setting TP at the most ambitious extension (2.0+). Price often stops at the 1.272 or 1.414 and rejects; banking a partial there beats holding all the way for the 2.0 you'll never see.",
    replayScoringConnection:
      "Not scored directly.",
    relatedTags: ["tp_unrealistic"],
  },
  {
    id: "trend_line",
    term: "Trend lines",
    category: "chart_tools",
    simpleDefinition:
      "A straight line connecting two or more swing lows (uptrend) or swing highs (downtrend). Acts as diagonal support or resistance.",
    whyItMatters:
      "Captures the slope of a move. A clean trend line broken on volume often signals a meaningful character change. Holding the trend line on a retest confirms the trend is intact.",
    example:
      "Connect BTC's recent swing lows at $54k, $56k, and $58k with a straight line. The line projects forward to $60k a few days ahead. A pullback that holds that $60k line is a textbook trend-continuation entry.",
    commonMistake:
      "Drawing a trend line through wicks instead of bodies, then redrawing it every time it breaks. If you're constantly adjusting a trend line, it's not a real level — abandon it.",
    replayScoringConnection:
      "Not scored directly.",
    relatedTags: [],
  },
  {
    id: "channel",
    term: "Channels (parallel trend lines)",
    category: "chart_tools",
    simpleDefinition:
      "Two parallel trend lines bracketing price: one connecting swing lows, one connecting swing highs. Defines a sloped range.",
    whyItMatters:
      "Inside a channel, the edge play is the same as a range: buy the lower line, sell the upper. Breaks of either line often produce momentum moves in the breakout direction.",
    example:
      "BTC trends up inside a channel from $50k to $65k over two months. Each tag of the lower line is a buying opportunity; each tag of the upper is a fade or partial-take area. A break of the upper line on volume often kicks off a steeper trend.",
    commonMistake:
      "Forcing a channel to fit the chart. If the parallel doesn't naturally line up with swing points, the channel is imaginary.",
    replayScoringConnection:
      "Not scored directly.",
    relatedTags: [],
  },
  {
    id: "pitchfork",
    term: "Pitchfork (Andrews')",
    category: "chart_tools",
    simpleDefinition:
      "Three parallel diagonal lines drawn from a pivot low through a swing high and its pullback low. The middle line is the 'median'; the two outer rails define a channel around it. Price tends to oscillate between them.",
    whyItMatters:
      "Captures the slope of a move with one tool. The median line acts like a magnet — price keeps reverting to it. The outer rails act like a channel: touches are entry/exit candidates. Cleaner than a single trend line when the move has a clear up-down rhythm.",
    example:
      "BTC bottoms at $50k (point A), runs to $60k (point B), pulls back to $55k (point C). Anchor the pitchfork at A and project through the midpoint of B–C ($57.5k). Three lines now extend forward: a median through the $57.5k area, an upper rail parallel to B, a lower rail parallel to C. Touches of the upper rail are fade candidates; the median is where price 'wants' to be.",
    commonMistake:
      "Drawing a pitchfork on a chart that's chopping. It needs a clear impulse (A → B) and a clean retracement (B → C) to anchor. Without those, you're drawing three random lines that don't mean anything.",
    replayScoringConnection:
      "Not scored directly.",
    relatedTags: [],
  },

  // Patterns & special (4)
  {
    id: "ichimoku",
    term: "Ichimoku Cloud",
    category: "chart_tools",
    simpleDefinition:
      "A five-line indicator showing trend direction, support/resistance, and momentum all at once. The 'cloud' is the area between two of the lines.",
    whyItMatters:
      "All-in-one trend system. Price above the cloud = uptrend. Price below = downtrend. Price inside the cloud = chop. Thick cloud = strong trend, thin cloud = weak. One glance gives you the regime.",
    example:
      "BTC trades above a thick green Ichimoku cloud on the daily — clear uptrend. A pullback into the cloud that bounces back above is a textbook trend-continuation entry.",
    commonMistake:
      "Trying to learn all five lines at once. Start with: price above/below cloud = trend, cloud thickness = strength. The rest is detail.",
    replayScoringConnection:
      "Not scored directly.",
    relatedTags: [],
  },
  {
    id: "pivot_points",
    term: "Pivot Points",
    category: "chart_tools",
    simpleDefinition:
      "Five horizontal levels (P, R1, R2, S1, S2) calculated from yesterday's high, low, and close. The same lines appear on every trader's chart at the same prices each day — that's what makes them act as support and resistance.",
    whyItMatters:
      "Pivots work because enough traders watch them that orders stack up at those exact prices. The central pivot (P) is today's neutral level; R1/S1 are the first reactions you'll typically see; R2/S2 are stretch targets. They reset every session, so they're an intraday tool, not a multi-day one.",
    example:
      "Yesterday's BTC: high $61,000, low $59,000, close $60,500.\nP = (61 + 59 + 60.5) ÷ 3 = $60,170 — today's neutral price.\nR1 = 2P − low = $61,340 — first resistance.\nS1 = 2P − high = $59,340 — first support.\nIf today's price is at $61,300, you're sitting right at R1 — a logical spot for a fade, a partial take, or at minimum a slowdown.",
    commonMistake:
      "Trading pivots in a strong trend. They work when sessions are balanced (price chops around P); in a runaway rally, R1 and R2 break through with barely a pause and you'll get stopped out fading them.",
    replayScoringConnection:
      "Not scored directly.",
    relatedTags: [],
  },
  {
    id: "donchian",
    term: "Donchian Channels",
    category: "chart_tools",
    simpleDefinition:
      "Bands drawn at the highest high and lowest low of the last N candles. The classic trend-following indicator (Richard Donchian, 1950s).",
    whyItMatters:
      "The simplest possible trend-following signal: buy a 20-day high breakout, sell a 20-day low breakdown. Has worked across markets for 70 years. Captures the basic principle that strong trends print new highs.",
    example:
      "BTC pushes above its 20-day high at $62k after weeks of range. The Donchian system says go long; stop below the 20-day low. Catches every major trend; gets chopped up in ranges.",
    commonMistake:
      "Using a short period (10) on a noisy market. You'll get whipsawed by normal range expansion. Stick with 20 or higher.",
    replayScoringConnection:
      "Not scored directly.",
    relatedTags: [],
  },
  {
    id: "parabolic_sar",
    term: "Parabolic SAR",
    category: "chart_tools",
    simpleDefinition:
      "Dots above or below price that flip sides during trend reversals. SAR = Stop And Reverse. Below price = uptrend; above price = downtrend.",
    whyItMatters:
      "Mechanical trailing-stop tool. Useful on charts that trend cleanly; the dots ratchet closer to price as the trend matures, locking in profit. Failed badly on ranging charts where the dots flip every few candles.",
    example:
      "BTC trends up; SAR dots sit below price and climb. Eventually price breaks down through the dots — the SAR flips above price, signalling trend over. Use as a trailing-stop reference, not an entry signal.",
    commonMistake:
      "Using SAR on a sideways chart. You'll get whipsawed on every fake breakout. It's a trend tool only.",
    replayScoringConnection:
      "Not scored directly.",
    relatedTags: [],
  },
  {
    id: "candle_patterns",
    term: "Candle patterns",
    category: "chart_tools",
    simpleDefinition:
      "Recurring shapes formed by one or two candles that traders read as signals of indecision, reversal, or continuation. Pattern recognition is the foundational chart-reading skill.",
    whyItMatters:
      "Real markets repeat: enough traders read the same patterns that they become self-fulfilling. A hammer at a clean support level draws buyers in because everyone sees the same reversal hint. The trainer detects six conservative examples (Doji, Hammer, Shooting Star, Engulfing, Inside Bar) so a beginner can practise spotting them in context.",
    example:
      "Price drops into a support level you'd already identified. A hammer prints — small body at the top of the bar, long lower wick rejecting the lows. Buyers are stepping in. Combined with the level, it's a tradable entry; alone, it's just a candle shape.",
    commonMistake:
      "Trading every flagged pattern as a signal. Patterns are context-dependent. A hammer in chop is noise; a hammer at a tested level after a five-bar drop is a setup. Always pair the pattern read with the structural read.",
    replayScoringConnection:
      "Not scored directly. The chart-tools scoring category rewards naming the pattern in your thesis when one's clearly on the chart.",
    relatedTags: [],
  },
  {
    id: "super_guppy",
    term: "Super Guppy (GMMA)",
    category: "chart_tools",
    simpleDefinition:
      "24 exponential moving averages drawn as two color-coded ribbons. The short ribbon (periods 3 to 25) tracks fast traders; the long ribbon (28 to 61) tracks slow investors. When the short ribbon is fully above the long ribbon, the trend is up; fully below, the trend is down; interleaved, the trend is in transition.",
    whyItMatters:
      "Compresses 24 EMAs into one visual reading. Spotting 'shorts crossing through longs' on a single chart is the same information you'd get from staring at four separate moving averages, but the ribbon makes it instant. The 'Super' is the color flip — green/red (or blue/orange in colorblind mode) tells you the trend state without counting lines.",
    example:
      "BTC pulls back during an uptrend. The short ribbon dips into the long ribbon — the color goes from blue to gray to orange as shorts cross under longs. That's the ribbon telling you the trend has at least paused; whether it resumes (color flips back to blue) or reverses (orange ribbon widens) is what the next 10 candles answer.",
    commonMistake:
      "Trading the color. Bull color doesn't mean buy; bear color doesn't mean short. The ribbon is a trend visualizer, not a signal. Use it for context — 'am I trading with the trend or against it?' — not as an entry trigger. The other mistake is reading the color as forward-looking; it's a description of what just happened, like every other moving-average tool.",
    replayScoringConnection:
      "Not scored directly. The chart-tools scoring category rewards naming the indicator in your thesis when the scenario was built around it.",
    relatedTags: [],
  },
];

// Central mistake → Learn mapping with priority ordering. Higher priority wins when an
// attempt has multiple tags. Tuned so the most account-threatening lesson surfaces first.
type TagMapping = { termId: string; priority: number };

export const MISTAKE_TO_LEARN: Record<MistakeTag, TagMapping> = {
  no_stop_loss: { termId: "stop_loss", priority: 100 },
  risk_too_high: { termId: "risk_percent", priority: 95 },
  liquidation_before_stop: { termId: "liquidation", priority: 92 },
  leverage_excessive: { termId: "leverage", priority: 90 },
  poor_risk_reward: { termId: "risk_reward", priority: 85 },
  stop_too_tight: { termId: "stop_loss", priority: 80 },
  stop_in_noise: { termId: "liquidity_sweep", priority: 78 },
  tp_unrealistic: { termId: "target_realism", priority: 75 },
  no_thesis: { termId: "thesis", priority: 70 },
  no_invalidation: { termId: "invalidation", priority: 70 },
  chasing_entry: { termId: "chasing", priority: 65 },
  forced_trade: { termId: "wait_decision", priority: 60 },
  wait_was_best: { termId: "wait_decision", priority: 55 },
  incomplete_plan: { termId: "thesis", priority: 50 },
  counter_trend: { termId: "trend", priority: 45 },
  missed_valid_setup: { termId: "wait_decision", priority: 40 },
  risk_too_low_to_learn: { termId: "risk_percent", priority: 30 },
  // v2.0 — trade management tags. Routed to the existing invalidation/stop_loss
  // terms for now; a dedicated "trade_management" Learn term arrives in v2.0.1.
  exited_too_early: { termId: "invalidation", priority: 72 },
  let_winner_become_loser: { termId: "stop_loss", priority: 82 },
  held_through_invalidation: { termId: "invalidation", priority: 88 },
  failed_to_protect: { termId: "stop_loss", priority: 70 },
  managed_well: { termId: "stop_loss", priority: 10 },
  // v4.0.3 — chart-tools usage. Routed to EMA as the most universally
  // applicable indicator term; a future revision could route per-indicator
  // once Scenario.availableIndicators is queryable here.
  ignored_indicator: { termId: "ema", priority: 35 },
  // v4.1 — portfolio thinking. All three route to "portfolio_risk", a new
  // Learn term added in this release; priority for the negative tags sits
  // between leverage_excessive (90) and stop_too_tight (80) so it surfaces
  // when other risk-control mistakes don't dominate.
  portfolio_overconcentrated: { termId: "portfolio_risk", priority: 85 },
  portfolio_correlated_overlap: { termId: "portfolio_risk", priority: 78 },
  portfolio_balanced: { termId: "portfolio_risk", priority: 10 },
};

export function termForTag(tag: MistakeTag): LearnTerm | null {
  const m = MISTAKE_TO_LEARN[tag];
  if (!m) return null;
  return LEARN_TERMS.find((t) => t.id === m.termId) ?? null;
}

// Highest priority non-positive tag, used to drive the primary recommendation.
export function primaryMistakeTag(tags: MistakeTag[]): MistakeTag | null {
  let best: { tag: MistakeTag; priority: number } | null = null;
  for (const t of tags) {
    const m = MISTAKE_TO_LEARN[t];
    if (!m) continue;
    if (!best || m.priority > best.priority) best = { tag: t, priority: m.priority };
  }
  return best?.tag ?? null;
}

export function primaryTermForTags(tags: MistakeTag[]): LearnTerm | null {
  const tag = primaryMistakeTag(tags);
  if (!tag) return null;
  return termForTag(tag);
}

export type TagSeverity = "high" | "medium" | "low";

// Read severity from the same priority numbers that drive the primary recommendation.
// ≥85 = account-threatening, 60–84 = process discipline, < 60 = minor / informational.
export function tagSeverity(tag: MistakeTag): TagSeverity {
  const p = MISTAKE_TO_LEARN[tag]?.priority ?? 0;
  if (p >= 85) return "high";
  if (p >= 60) return "medium";
  return "low";
}

export const SEVERITY_CLASS: Record<TagSeverity, string> = {
  high: "border-2 border-bad/70 ring-1 ring-bad/30 bg-bad/15 text-bad",
  medium: "border-2 border-bad/50 bg-bad/10 text-bad",
  low: "border border-bad/30 bg-bad/5 text-bad",
};

// Map Learn terms to a Practice focus key used in `/practice?focus=<key>` routing.
const TERM_TO_FOCUS: Record<string, string> = {
  stop_loss: "stop-placement",
  risk_reward: "risk-reward",
  leverage: "leverage",
  risk_percent: "position-sizing",
  position_sizing: "position-sizing",
  thesis: "thesis",
  invalidation: "invalidation",
  target_realism: "target-planning",
  chasing: "entry-timing",
  wait_decision: "patience",
  fakeout: "failed-breakout",
  liquidity_sweep: "liquidity-sweep",
  liquidation: "leverage",
  trend: "entry-timing",
};

export function focusForTerm(termId: string): string | null {
  return TERM_TO_FOCUS[termId] ?? null;
}

// Practice setup-type pools that exercise each focus. Used to decide whether the
// "Practice this concept" button is offered and to pre-filter the practice page.
const FOCUS_TO_SETUP_TYPES: Record<string, SetupType[]> = {
  "stop-placement": ["liquidity_sweep", "support_breakdown"],
  "risk-reward": ["clean_retest", "trend_continuation"],
  "leverage": ["leverage_trap"],
  "position-sizing": ["leverage_trap"],
  "thesis": ["no_setup", "range_chop"],
  "invalidation": ["support_breakdown", "failed_breakout"],
  "target-planning": ["overextended"],
  "entry-timing": ["clean_retest", "trend_continuation"],
  "patience": ["range_chop", "news_volatility", "no_setup"],
  "failed-breakout": ["failed_breakout"],
  "liquidity-sweep": ["liquidity_sweep"],
};

export function setupTypesForFocus(focus: string): SetupType[] {
  return FOCUS_TO_SETUP_TYPES[focus] ?? [];
}

export const ALL_FOCUS_KEYS = Object.keys(FOCUS_TO_SETUP_TYPES);

export function termById(id: string): LearnTerm | null {
  return LEARN_TERMS.find((t) => t.id === id) ?? null;
}

export function relatedTerms(term: LearnTerm, max = 4): LearnTerm[] {
  if (term.relatedTags.length === 0) return [];
  const tagSet = new Set(term.relatedTags);
  const scored = LEARN_TERMS
    .filter((t) => t.id !== term.id)
    .map((t) => ({
      term: t,
      overlap: t.relatedTags.filter((x) => tagSet.has(x)).length,
      sameCategory: t.category === term.category ? 1 : 0,
    }))
    .filter((s) => s.overlap > 0 || s.sameCategory > 0);

  scored.sort(
    (a, b) =>
      b.overlap - a.overlap ||
      b.sameCategory - a.sameCategory ||
      a.term.term.localeCompare(b.term.term)
  );
  return scored.slice(0, max).map((s) => s.term);
}

// v2.1 Phase 2 — categories share one neutral theme. The previous per-category
// colors hijacked every semantic role (risk=bad, chart=accent, planning=good,
// crypto=warn) so categorization swallowed the entire color palette. Categories
// are now distinguished by text only; the active chip uses accent because
// "currently selected" IS a primary affordance for the filter row.
const NEUTRAL_THEME = {
  tone: "text-muted",
  bar: "bg-line",
  chip: "border-line text-muted hover:bg-panel2 hover:text-text",
  chipActive: "bg-accent/15 border-accent/60 text-accent",
  badge: "border-line bg-panel2 text-muted",
} as const;

export const CATEGORY_THEME: Record<
  LearnCategory,
  { tone: string; bar: string; chip: string; chipActive: string; badge: string }
> = {
  risk_management: NEUTRAL_THEME,
  chart_reading: NEUTRAL_THEME,
  chart_tools: NEUTRAL_THEME,
  trade_planning: NEUTRAL_THEME,
  crypto_specific: NEUTRAL_THEME,
};
