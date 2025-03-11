// Variables used by Scriptable.
// These must be at the very top of the file. Do not edit.
// icon-color: pink; icon-glyph: magic;
// Stock Options Profit Calculator - Simplified Version
// Version: 3.7

// Configuration parameters
const config = {
    stockSymbol: "0700", // Stock code
    optionsCount: 50000,    // Total number of options
    strikePrice: 20,        // Strike price
    vestingPeriods: 5,      // Number of vesting periods (years)
    startDate: "2022-09-01", // Start date (YYYY-MM-DD format)
    taxRate: 0.20           // Tax rate (20%)
  };
  
  // Create widget
  let widget = new ListWidget();
  widget.backgroundColor = new Color("#1E1E1E");
  widget.setPadding(14, 14, 14, 14);
  
  // Main function
  async function run() {
    try {
      // Get current stock price
      const currentPrice = await fetchStockPrice(config.stockSymbol);
  
      // Calculate current profit
      const profit = calculateProfit(
        currentPrice,
        config.optionsCount,
        config.strikePrice,
        config.vestingPeriods,
        config.startDate,
        config.taxRate
      );
  
      // Add core information
      addCoreInfo(widget, config.stockSymbol, currentPrice, profit);
  
      // Add calculation formula
      addSimpleFormula(widget, config, profit, currentPrice);
  
    } catch (error) {
      // Display error message
      let errorText = widget.addText(`Error: ${error.message}`);
      errorText.textColor = Color.red();
      errorText.font = Font.systemFont(12);
      console.error(`Error: ${error.message}`);
    }
  
    // Finalize widget
    if (config.widgetFamily === "small") {
      widget.presentSmall();
    } else if (config.widgetFamily === "large") {
      widget.presentLarge();
    } else {
      widget.presentMedium();
    }
  
    return widget;
  }
  
  // Get stock price - using Tencent Securities API
  async function fetchStockPrice(symbol) {
    try {
      // Format stock code for Tencent API
      let qqSymbol = formatQQSymbol(symbol);
  
      // Build API URL
      const url = `https://qt.gtimg.cn/q=${qqSymbol}`;
      const request = new Request(url);
  
      // Get response
      const response = await request.loadString();
      console.log("Tencent API response:", response.substring(0, 100) + "...");
  
      // Parse response
      const price = parseQQResponse(response);
      return price;
    } catch (error) {
      console.error(`Failed to get stock price: ${error.message}`);
  
      // Try backup method
      try {
        return await fetchStockPriceBackup(symbol);
      } catch (backupError) {
        console.error(`Backup method also failed: ${backupError.message}`);
  
        // If all methods fail, use default value
        return config.strikePrice;
      }
    }
  }
  
  // Backup method - using another Tencent API endpoint
  async function fetchStockPriceBackup(symbol) {
    // Format stock code
    let qqSymbol = formatQQSymbol(symbol);
  
    // Use another API endpoint
    const url = `https://sqt.gtimg.cn/utf8/q=${qqSymbol}`;
    const request = new Request(url);
    const response = await request.loadString();
  
    return parseQQResponse(response);
  }
  
  // Format stock code for Tencent API
  function formatQQSymbol(symbol) {
    symbol = symbol.toLowerCase();
  
    if (symbol.includes(".hk")) {
      // Hong Kong stocks format: hk09863
      const code = symbol.split(".")[0].padStart(5, "0");
      return `hk${code}`;
    } else if (symbol.includes(".sh")) {
      // Shanghai stocks format: sh600000
      return symbol;
    } else if (symbol.includes(".sz")) {
      // Shenzhen stocks format: sz000001
      return symbol;
    } else {
      // Default to Hong Kong stocks
      const code = symbol.padStart(5, "0");
      return `hk${code}`;
    }
  }
  
  // Parse Tencent API response
  function parseQQResponse(response) {
    try {
      // Response format: v_hk09863="51~name~price~..."
      const match = response.match(/="([^"]+)"/);
      if (match && match[1]) {
        const parts = match[1].split("~");
  
        // Price is at position 4 (index 3)
        if (parts.length > 3) {
          const price = parseFloat(parts[3]);
          if (!isNaN(price) && price > 0) {
            return price;
          }
        }
      }
  
      throw new Error("Unable to parse price from response");
    } catch (error) {
      console.error(`Parse response error: ${error.message}`);
      throw error;
    }
  }
  
  // Calculate current profit - using yearly vesting method
  function calculateProfit(currentPrice, optionsCount, strikePrice, vestingPeriods, startDateStr, taxRate) {
    // Parse start date
    const startDate = new Date(startDateStr);
    const currentDate = new Date();
  
    // Calculate years passed (by complete years)
    const startYear = startDate.getFullYear();
    const startMonth = startDate.getMonth();
    const startDay = startDate.getDate();
  
    const currentYear = currentDate.getFullYear();
    const currentMonth = currentDate.getMonth();
    const currentDay = currentDate.getDate();
  
    // Calculate completed vesting years
    let completedYears = currentYear - startYear;
  
    // If current month is less than start month, or month is the same but day is less, subtract a year
    if (currentMonth < startMonth || (currentMonth === startMonth && currentDay < startDay)) {
      completedYears--;
    }
  
    // Ensure completed years is not negative
    completedYears = Math.max(0, completedYears);
  
    // Calculate vested options count (by yearly vesting)
    const vestedOptionsCount = Math.min(completedYears, vestingPeriods) * Math.floor(optionsCount / vestingPeriods);
  
    // Calculate vested ratio
    const vestedRatio = vestedOptionsCount / optionsCount;
  
    // Calculate total profit (pre-tax)
    const grossProfit = vestedOptionsCount * (currentPrice - strikePrice);
  
    // Calculate after-tax profit
    const netProfit = grossProfit * (1 - taxRate);
  
    return {
      vestedOptionsCount,
      vestedRatio,
      grossProfit,
      netProfit,
      completedYears,
      totalYears: vestingPeriods
    };
  }
  
  // Add core information
  function addCoreInfo(widget, symbol, price, profit) {
    // Stock code and price row
    let stockStack = widget.addStack();
    stockStack.layoutHorizontally();
    stockStack.centerAlignContent();
  
    // Stock code
    let symbolText = stockStack.addText(`${symbol.toUpperCase()}`);
    symbolText.font = Font.boldSystemFont(22);
    symbolText.textColor = Color.white();
  
    stockStack.addSpacer();
  
    // Current stock price
    const currencySymbol = "¥";
    let priceText = stockStack.addText(`${currencySymbol}${price.toFixed(2)}`);
    priceText.font = Font.boldSystemFont(22);
    priceText.textColor = new Color("#4CD964");
  
    widget.addSpacer(10);
  
    // Current profit and vesting percentage
    let profitStack = widget.addStack();
    profitStack.layoutHorizontally();
    profitStack.centerAlignContent();
  
    // Profit label
    let profitLabel = profitStack.addText("Profit: ");
    profitLabel.font = Font.mediumSystemFont(16);
    profitLabel.textColor = Color.gray();
  
    // Profit amount
    let profitText = profitStack.addText(`${currencySymbol}${profit.netProfit.toFixed(2)}`);
    profitText.font = Font.boldSystemFont(18);
    profitText.textColor = profit.netProfit >= 0 ? new Color("#4CD964") : new Color("#FF3B30");
  
    profitStack.addSpacer();
  
    // Vesting percentage
    let percentText = profitStack.addText(`${(profit.vestedRatio * 100).toFixed(0)}%`);
    percentText.font = Font.mediumSystemFont(16);
    percentText.textColor = new Color("#5AC8FA");
  
    widget.addSpacer(15);
  }
  
  // Add simplified calculation formula
  function addSimpleFormula(widget, config, profit, currentPrice) {
    // Formula title
    let formulaTitle = widget.addText("Formula");
    formulaTitle.font = Font.mediumSystemFont(12);
    formulaTitle.textColor = new Color("#5AC8FA");
    widget.addSpacer(2);
  
    // Formula details
    let formulaStack = widget.addStack();
    formulaStack.layoutVertically();
    formulaStack.spacing = 2;
  
    // Vested options
    const currencySymbol = config.stockSymbol.toLowerCase().includes(".hk") ? "HK$" : "¥";
  
    addFormulaRow(formulaStack,
      `${profit.vestedOptionsCount} × (${currencySymbol}${currentPrice.toFixed(2)} - ${currencySymbol}${config.strikePrice}) × (1 - ${config.taxRate * 100}%)`
    );
  }
  
  // Add formula row
  function addFormulaRow(stack, text) {
    let row = stack.addText(text);
    row.font = Font.systemFont(10);
    row.textColor = Color.gray();
    row.lineLimit = 1;
    row.minimumScaleFactor = 0.5;
  }
  
  // Run script
  await run();
  