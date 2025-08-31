// List of popular Indian stocks for autocomplete suggestions
export interface StockSuggestion {
  symbol: string
  name: string
  sector: string
}

export const INDIAN_STOCKS: StockSuggestion[] = [
  // Technology
  { symbol: "TCS", name: "Tata Consultancy Services Ltd", sector: "Information Technology" },
  { symbol: "INFY", name: "Infosys Ltd", sector: "Information Technology" },
  { symbol: "HCLTECH", name: "HCL Technologies Ltd", sector: "Information Technology" },
  { symbol: "WIPRO", name: "Wipro Ltd", sector: "Information Technology" },
  { symbol: "TECHM", name: "Tech Mahindra Ltd", sector: "Information Technology" },
  
  // Banking & Financial
  { symbol: "HDFCBANK", name: "HDFC Bank Ltd", sector: "Banking" },
  { symbol: "ICICIBANK", name: "ICICI Bank Ltd", sector: "Banking" },
  { symbol: "SBIN", name: "State Bank of India", sector: "Banking" },
  { symbol: "KOTAKBANK", name: "Kotak Mahindra Bank Ltd", sector: "Banking" },
  { symbol: "AXISBANK", name: "Axis Bank Ltd", sector: "Banking" },
  { symbol: "INDUSINDBK", name: "IndusInd Bank Ltd", sector: "Banking" },
  { symbol: "HDFCLIFE", name: "HDFC Life Insurance Company Ltd", sector: "Financial Services" },
  { symbol: "SBILIFE", name: "SBI Life Insurance Company Ltd", sector: "Financial Services" },
  
  // Energy & Oil
  { symbol: "RELIANCE", name: "Reliance Industries Ltd", sector: "Oil & Gas" },
  { symbol: "ONGC", name: "Oil & Natural Gas Corporation Ltd", sector: "Oil & Gas" },
  { symbol: "IOC", name: "Indian Oil Corporation Ltd", sector: "Oil & Gas" },
  { symbol: "BPCL", name: "Bharat Petroleum Corporation Ltd", sector: "Oil & Gas" },
  { symbol: "HINDPETRO", name: "Hindustan Petroleum Corporation Ltd", sector: "Oil & Gas" },
  { symbol: "GAIL", name: "GAIL India Ltd", sector: "Oil & Gas" },
  
  // Automotive
  { symbol: "MARUTI", name: "Maruti Suzuki India Ltd", sector: "Automobile" },
  { symbol: "TATAMOTORS", name: "Tata Motors Ltd", sector: "Automobile" },
  { symbol: "M&M", name: "Mahindra & Mahindra Ltd", sector: "Automobile" },
  { symbol: "BAJAJ-AUTO", name: "Bajaj Auto Ltd", sector: "Automobile" },
  { symbol: "HEROMOTOCO", name: "Hero MotoCorp Ltd", sector: "Automobile" },
  { symbol: "EICHERMOT", name: "Eicher Motors Ltd", sector: "Automobile" },
  
  // Consumer Goods
  { symbol: "HINDUNILVR", name: "Hindustan Unilever Ltd", sector: "FMCG" },
  { symbol: "ITC", name: "ITC Ltd", sector: "FMCG" },
  { symbol: "NESTLEIND", name: "Nestle India Ltd", sector: "FMCG" },
  { symbol: "BRITANNIA", name: "Britannia Industries Ltd", sector: "FMCG" },
  { symbol: "DABUR", name: "Dabur India Ltd", sector: "FMCG" },
  { symbol: "GODREJCP", name: "Godrej Consumer Products Ltd", sector: "FMCG" },
  
  // Pharmaceuticals
  { symbol: "SUNPHARMA", name: "Sun Pharmaceutical Industries Ltd", sector: "Pharmaceuticals" },
  { symbol: "DRREDDY", name: "Dr Reddy's Laboratories Ltd", sector: "Pharmaceuticals" },
  { symbol: "CIPLA", name: "Cipla Ltd", sector: "Pharmaceuticals" },
  { symbol: "BIOCON", name: "Biocon Ltd", sector: "Pharmaceuticals" },
  { symbol: "LUPIN", name: "Lupin Ltd", sector: "Pharmaceuticals" },
  { symbol: "AUROPHARMA", name: "Aurobindo Pharma Ltd", sector: "Pharmaceuticals" },
  
  // Metals & Mining
  { symbol: "TATASTEEL", name: "Tata Steel Ltd", sector: "Metals" },
  { symbol: "JSWSTEEL", name: "JSW Steel Ltd", sector: "Metals" },
  { symbol: "HINDALCO", name: "Hindalco Industries Ltd", sector: "Metals" },
  { symbol: "SAIL", name: "Steel Authority of India Ltd", sector: "Metals" },
  { symbol: "VEDL", name: "Vedanta Ltd", sector: "Metals" },
  { symbol: "COALINDIA", name: "Coal India Ltd", sector: "Mining" },
  
  // Telecom
  { symbol: "BHARTIARTL", name: "Bharti Airtel Ltd", sector: "Telecom" },
  { symbol: "IDEA", name: "Vodafone Idea Ltd", sector: "Telecom" },
  
  // Cement
  { symbol: "ULTRACEMCO", name: "UltraTech Cement Ltd", sector: "Cement" },
  { symbol: "SHREECEM", name: "Shree Cement Ltd", sector: "Cement" },
  { symbol: "GRASIM", name: "Grasim Industries Ltd", sector: "Cement" },
  { symbol: "ACC", name: "ACC Ltd", sector: "Cement" },
  
  // Power
  { symbol: "POWERGRID", name: "Power Grid Corporation of India Ltd", sector: "Power" },
  { symbol: "NTPC", name: "NTPC Ltd", sector: "Power" },
  { symbol: "ADANIPOWER", name: "Adani Power Ltd", sector: "Power" },
  
  // Infrastructure
  { symbol: "LT", name: "Larsen & Toubro Ltd", sector: "Infrastructure" },
  { symbol: "ADANIPORTS", name: "Adani Ports and Special Economic Zone Ltd", sector: "Infrastructure" },
  
  // Real Estate
  { symbol: "DLF", name: "DLF Ltd", sector: "Real Estate" },
  { symbol: "GODREJPROP", name: "Godrej Properties Ltd", sector: "Real Estate" },
  
  // Agriculture
  { symbol: "UBL", name: "United Breweries Ltd", sector: "Beverages" },
  
  // Others
  { symbol: "BAJFINANCE", name: "Bajaj Finance Ltd", sector: "Financial Services" },
  { symbol: "BAJAJFINSV", name: "Bajaj Finserv Ltd", sector: "Financial Services" },
  { symbol: "ASIANPAINT", name: "Asian Paints Ltd", sector: "Paints" },
  { symbol: "TITAN", name: "Titan Company Ltd", sector: "Consumer Durables" }
]

// Function to search stocks based on query
export function searchStocks(query: string, limit: number = 10): StockSuggestion[] {
  if (!query || query.length < 1) return []
  
  const searchTerm = query.toUpperCase()
  
  return INDIAN_STOCKS.filter(stock => 
    stock.symbol.includes(searchTerm) || 
    stock.name.toUpperCase().includes(searchTerm)
  ).slice(0, limit)
}

// Function to get stock by symbol
export function getStockBySymbol(symbol: string): StockSuggestion | undefined {
  return INDIAN_STOCKS.find(stock => stock.symbol === symbol.toUpperCase())
}
