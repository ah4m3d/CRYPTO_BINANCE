const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

async function verifyDatabase() {
  try {
    console.log('🔍 Verifying database connection...');
    
    // Test database connection
    await prisma.$connect();
    console.log('✅ Database connection successful!');
    
    // Check if tables exist
    const userCount = await prisma.user.count();
    const tradeCount = await prisma.trade.count();
    const watchlistCount = await prisma.watchlist.count();
    const ruleCount = await prisma.tradingRule.count();
    
    console.log('📊 Database Status:');
    console.log(`   Users: ${userCount}`);
    console.log(`   Trades: ${tradeCount}`);
    console.log(`   Watchlist items: ${watchlistCount}`);
    console.log(`   Trading rules: ${ruleCount}`);
    
    console.log('✅ Database schema is properly set up!');
    
  } catch (error) {
    console.error('❌ Database verification failed:', error.message);
  } finally {
    await prisma.$disconnect();
  }
}

verifyDatabase();
