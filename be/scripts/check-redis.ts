#!/usr/bin/env ts-node
import '../src/env'
import { connectRedis, redisClient } from '../src/redis'

async function checkRedis() {
  console.log('Checking Redis connection...')
  
  const connected = await connectRedis()
  
  if (!connected) {
    console.error('❌ Redis connection failed')
    process.exit(1)
  }
  
  console.log('✅ Redis connected')
  
  // Check room data
  const roomIds = await redisClient.smembers('rooms:index')
  console.log(`\nFound ${roomIds.length} room(s) in Redis:`)
  
  for (const roomId of roomIds) {
    const roomData = await redisClient.get(`room:${roomId}`)
    if (roomData) {
      const room = JSON.parse(roomData)
      console.log(`  - ${roomId}: status=${room.status}, players=${room.players.length}, lastActivity=${new Date(room.lastActivity).toISOString()}`)
    } else {
      console.log(`  - ${roomId}: ⚠️  Data missing (orphaned index entry)`)
    }
  }
  
  process.exit(0)
}

checkRedis().catch(err => {
  console.error('Error:', err)
  process.exit(1)
})
