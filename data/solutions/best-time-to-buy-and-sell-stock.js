// approach: Track the lowest price so far and the best profit
var maxProfit = function (prices) {
  let minPrice = prices[0]; // Cheapest price seen so far
  let best = 0; // Best profit so far
  for (let i = 1; i < prices.length; i++) { // Visit each later day with i
    const price = prices[i]; // Today's price
    if (price < minPrice) { // Is {price} a new low?
      minPrice = price; // Yes: buying here would be cheapest so far
    } else if (price - minPrice > best) { // Would selling today at {price} beat {best}?
      best = price - minPrice; // Yes: sell here for {price} minus {minPrice}
    }
  }
  return best; // The best single buy-then-sell profit
};
