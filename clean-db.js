const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

async function cleanDatabase() {
  try {
    console.log('🧹 Database Cleanup Options');
    console.log('==========================');
    
    // Show current database state
    const userCount = await prisma.user.count();
    const tradeCount = await prisma.trade.count();
    const watchlistCount = await prisma.watchlist.count();
    const rulesCount = await prisma.tradingRule.count();
    
    console.log('\n📊 Current Database State:');
    console.log(`   Users: ${userCount}`);
    console.log(`   Trades: ${tradeCount}`);
    console.log(`   Watchlist items: ${watchlistCount}`);
    console.log(`   Trading rules: ${rulesCount}`);
    
    // Get command line argument for what to clean
    const cleanType = process.argv[2] || 'help';
    
    switch (cleanType) {
      case 'trades':
        const deletedTrades = await prisma.trade.deleteMany({});
        console.log(`\n✅ Deleted ${deletedTrades.count} trades`);
        break;
        
      case 'watchlist':
        const deletedWatchlist = await prisma.watchlist.deleteMany({});
        console.log(`\n✅ Deleted ${deletedWatchlist.count} watchlist items`);
        break;
        
      case 'rules':
        const deletedRules = await prisma.tradingRule.deleteMany({});
        console.log(`\n✅ Deleted ${deletedRules.count} trading rules`);
        break;
        
      case 'all':
        await prisma.trade.deleteMany({});
        await prisma.watchlist.deleteMany({});
        await prisma.tradingRule.deleteMany({});
        console.log('\n✅ Deleted ALL data (kept users)');
        break;
        
      case 'reset':
        await prisma.trade.deleteMany({});
        await prisma.watchlist.deleteMany({});
        await prisma.tradingRule.deleteMany({});
        await prisma.user.deleteMany({});
        console.log('\n✅ FULL RESET - Deleted everything');
        break;
        
      default:
        console.log('\n💡 Usage:');
        console.log('   node clean-db.js trades     - Delete all trades');
        console.log('   node clean-db.js watchlist  - Delete all watchlist items');
        console.log('   node clean-db.js rules      - Delete all trading rules');
        console.log('   node clean-db.js all        - Delete all data (keep users)');
        console.log('   node clean-db.js reset      - FULL RESET (delete everything)');
        console.log('\n🔍 Current state shown above');
        break;
    }
    
  } catch (error) {
    console.error('❌ Error during cleanup:', error);
  } finally {
    await prisma.$disconnect();
  }
}

cleanDatabase();
