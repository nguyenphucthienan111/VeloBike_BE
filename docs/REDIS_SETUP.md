# 🔴 REDIS SETUP GUIDE

## 📋 REDIS INSTALLATION

### **Windows (Recommended)**

#### **Option 1: Using WSL2 (Recommended)**
```bash
# Install WSL2 first, then:
sudo apt update
sudo apt install redis-server

# Start Redis
sudo service redis-server start

# Test connection
redis-cli ping
# Should return: PONG
```

#### **Option 2: Using Docker**
```bash
# Pull and run Redis container
docker run -d --name redis -p 6379:6379 redis:latest

# Test connection
docker exec -it redis redis-cli ping
# Should return: PONG
```

#### **Option 3: Windows Native (Not recommended)**
- Download from: https://github.com/microsoftarchive/redis/releases
- Install and run as Windows service

### **macOS**
```bash
# Using Homebrew
brew install redis

# Start Redis
brew services start redis

# Test connection
redis-cli ping
```

### **Linux (Ubuntu/Debian)**
```bash
sudo apt update
sudo apt install redis-server

# Start Redis
sudo systemctl start redis-server
sudo systemctl enable redis-server

# Test connection
redis-cli ping
```

---

## ⚙️ CONFIGURATION

### **Local Development (No Password)**
```bash
# .env file
REDIS_URL=redis://localhost:6379
# REDIS_PASSWORD=  (leave empty)
```

### **Production (With Password)**
```bash
# .env file
REDIS_URL=redis://username:password@your-redis-host:6379
REDIS_PASSWORD=your_secure_password
```

---

## 🧪 TESTING REDIS CONNECTION

### **1. Test Redis CLI**
```bash
redis-cli ping
# Expected: PONG

redis-cli set test "hello"
# Expected: OK

redis-cli get test
# Expected: "hello"
```

### **2. Test with Node.js**
```bash
# Start your app
npm run dev

# Check console for:
# ✅ Redis Connected
```

### **3. Test API with Redis**
```bash
# Call any API that uses caching
curl http://localhost:5000/api/listings
# Check console for cache operations
```

---

## 🔒 SECURITY SETUP (Production)

### **Enable Password Authentication**
```bash
# Edit Redis config
sudo nano /etc/redis/redis.conf

# Add/uncomment:
requirepass your_secure_password

# Restart Redis
sudo systemctl restart redis-server
```

### **Test with Password**
```bash
redis-cli -a your_secure_password ping
# Expected: PONG
```

---

## 🚨 TROUBLESHOOTING

### **Error: ECONNREFUSED 127.0.0.1:6379**
```bash
# Check if Redis is running
sudo systemctl status redis-server

# Start Redis if not running
sudo systemctl start redis-server

# Check port
netstat -tlnp | grep 6379
```

### **Error: NOAUTH Authentication required**
```bash
# Redis has password but .env doesn't
# Update .env with correct password:
REDIS_PASSWORD=your_actual_password
```

### **Error: Connection timeout**
```bash
# Check Redis config
redis-cli config get bind
# Should include 127.0.0.1

# Check firewall
sudo ufw status
```

---

## 📊 REDIS MONITORING

### **Basic Commands**
```bash
# Check Redis info
redis-cli info

# Monitor commands
redis-cli monitor

# Check memory usage
redis-cli info memory

# List all keys
redis-cli keys "*"

# Clear all data (DANGER!)
redis-cli flushall
```

### **Performance Monitoring**
```bash
# Check slow queries
redis-cli slowlog get 10

# Check connected clients
redis-cli client list

# Check stats
redis-cli info stats
```

---

## 🔧 REDIS CONFIGURATION FOR VELOBIKE

### **Recommended Settings**
```bash
# /etc/redis/redis.conf

# Memory
maxmemory 256mb
maxmemory-policy allkeys-lru

# Persistence (optional for cache)
save 900 1
save 300 10
save 60 10000

# Network
bind 127.0.0.1
port 6379
timeout 300

# Security (production)
requirepass your_secure_password
```

---

## 🚀 VELOBIKE REDIS USAGE

### **What we cache:**
- ✅ Search results (10 minutes)
- ✅ User sessions (24 hours)
- ✅ Listing data (5 minutes)
- ✅ Rate limiting counters
- ✅ API response cache

### **Cache Keys:**
```
listings:search:base64_query
session:user_id
rate_limit:ip_address
search:query_hash
```

### **Memory Usage Estimate:**
- **Development**: ~10-50MB
- **Production**: ~100-500MB

---

## ✅ QUICK START CHECKLIST

- [ ] Install Redis
- [ ] Start Redis service
- [ ] Test with `redis-cli ping`
- [ ] Update .env file
- [ ] Start VeloBike app
- [ ] Check for "✅ Redis Connected" in console
- [ ] Test API endpoints

---

**Status**: 🟢 **Ready when Redis is running locally**