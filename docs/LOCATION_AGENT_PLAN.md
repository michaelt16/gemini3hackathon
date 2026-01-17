# Location Agent Plan for Live API

## 🎯 Goal
Add an AI agent to the Live API conversation that can help with location-related questions:
- Find locations mentioned in photos
- Calculate distances between places
- Get location information (country, city, coordinates)
- Provide context about places (historical, cultural)

## 🤔 Challenge
Gemini Live API (WebSocket) doesn't directly support function calling like the regular API. We need a creative solution.

## 💡 Solution Options

### **Option 1: Hybrid Approach (RECOMMENDED)**
- Keep Live API for natural conversation
- Detect location mentions in conversation
- Call location tools in background
- Inject results back into conversation naturally

**Pros:**
- ✅ Works with current Live API setup
- ✅ Natural conversation flow
- ✅ No major architecture changes

**Cons:**
- ⚠️ Requires parsing conversation for location mentions
- ⚠️ Less "true" agent behavior (tools called by us, not agent)

### **Option 2: Function Calling via API Route**
- Create `/api/agent-tools` endpoint
- Agent mentions it needs location info
- We call the endpoint with location query
- Return result in conversation

**Pros:**
- ✅ More explicit tool usage
- ✅ Easier to track what tools were used

**Cons:**
- ⚠️ Requires agent to explicitly request tools
- ⚠️ Less seamless conversation

### **Option 3: Post-Processing Agent**
- Let conversation happen naturally
- After each message, check for location mentions
- If found, call tools and add context to next response

**Pros:**
- ✅ Seamless user experience
- ✅ No conversation interruption

**Cons:**
- ⚠️ Adds latency
- ⚠️ Might add info user didn't ask for

## 🏗️ Recommended Implementation: Option 1 (Hybrid)

### Architecture
```
User speaks → Live API → Agent responds
                    ↓
            Detect location mentions
                    ↓
            Call location tools
                    ↓
            Inject results into next response
```

### Tools to Build

1. **Geocoding Tool** - Convert place names to coordinates
   - Input: "Bangka, Indonesia"
   - Output: { lat, lng, country, region, formatted }

2. **Distance Calculator** - Calculate distance between places
   - Input: { from: "Manila", to: "Bangka" }
   - Output: { distance: "1234 km", duration: "2h 30m" }

3. **Location Info Tool** - Get details about a place
   - Input: "Pantai Pesona, Bangka"
   - Output: { type: "beach", description, nearby places }

4. **Reverse Geocoding** - Get place name from coordinates (if photo has GPS)

### Implementation Steps

#### Step 1: Create Location Tools API
```typescript
// src/app/api/agent-tools/location/route.ts
- geocode(placeName) → coordinates + info
- calculateDistance(from, to) → distance + route
- getLocationInfo(placeName) → details
```

#### Step 2: Create Location Detection
```typescript
// src/lib/location-agent.ts
- detectLocationMentions(message: string) → string[]
- extractLocationContext(conversation) → locations
```

#### Step 3: Integrate with Live API
```typescript
// In LiveMode.tsx
- Listen to agent messages
- Detect location mentions
- Call location tools
- Add context to system instruction or next message
```

#### Step 4: Update System Instruction
```typescript
// Tell agent it can help with locations
"You can help with location information:
- If user mentions a place, you can find it on a map
- You can calculate distances between places
- You can provide context about locations
When you want location info, mention it naturally in conversation."
```

## 📋 Detailed Plan

### Phase 1: Location Tools (Simple)
**Time: 1-2 hours**

1. Create geocoding API route using:
   - Google Geocoding API (free tier: $5/1000 requests)
   - OR OpenStreetMap Nominatim (free, no key needed)
   - OR Mapbox Geocoding API

2. Create distance calculation:
   - Use Haversine formula for straight-line distance
   - OR Google Distance Matrix API for driving distance

3. Create location info:
   - Use Wikipedia API or Google Places API
   - OR simple description from geocoding

### Phase 2: Location Detection (Medium)
**Time: 1 hour**

1. Create location mention detector:
   - Use regex patterns for common location phrases
   - "in [place]", "at [place]", "from [place] to [place]"
   - Use NER (Named Entity Recognition) if needed

2. Extract location context from conversation:
   - Track mentioned places
   - Store in conversation session

### Phase 3: Integration (Medium)
**Time: 1-2 hours**

1. Hook into Live API message handler
2. Detect locations in agent/user messages
3. Call location tools when needed
4. Format results naturally
5. Add to conversation context

### Phase 4: UI Enhancement (Optional)
**Time: 30 min**

1. Show location info in conversation
2. Display map if location found
3. Show distance calculations visually

## 🛠️ Tools Implementation

### Tool 1: Geocoding
```typescript
// src/app/api/agent-tools/geocode/route.ts
POST /api/agent-tools/geocode
Body: { placeName: "Bangka, Indonesia" }
Response: {
  place: "Bangka, Indonesia",
  coordinates: { lat: -2.1, lng: 106.1 },
  country: "Indonesia",
  region: "Bangka Belitung",
  formatted: "Bangka, Bangka Belitung, Indonesia"
}
```

### Tool 2: Distance
```typescript
// src/app/api/agent-tools/distance/route.ts
POST /api/agent-tools/distance
Body: { from: "Manila", to: "Bangka" }
Response: {
  from: { name: "Manila", coords: {...} },
  to: { name: "Bangka", coords: {...} },
  distance: { km: 1234, miles: 766 },
  duration: "2h 30m" (if driving)
}
```

### Tool 3: Location Info
```typescript
// src/app/api/agent-tools/location-info/route.ts
POST /api/agent-tools/location-info
Body: { placeName: "Pantai Pesona" }
Response: {
  name: "Pantai Pesona",
  type: "beach",
  description: "Popular beach in Bangka...",
  nearby: ["Bangka City", "Pangkal Pinang"]
}
```

## 🔄 Conversation Flow Example

```
User: "This photo was taken in Bangka, Indonesia"
  ↓
Agent: "Oh, Bangka! That's in Indonesia. Let me find out more about it..."
  ↓
[Background: Call geocode("Bangka, Indonesia")]
  ↓
Agent: "Bangka is an island in the Bangka Belitung province of Indonesia. 
        It's known for its beautiful beaches like Pantai Pesona. 
        How far is that from where you live now?"
```

## 🎯 Success Criteria

- ✅ Agent can identify location mentions in conversation
- ✅ Agent can provide location information naturally
- ✅ Agent can calculate distances when asked
- ✅ No disruption to natural conversation flow
- ✅ Works seamlessly with existing Live API

## ⚠️ Considerations

1. **API Costs**: Geocoding APIs may have costs
   - Solution: Use free tier or OpenStreetMap

2. **Rate Limiting**: Don't call tools on every message
   - Solution: Cache results, only call for new locations

3. **Privacy**: Location data in conversations
   - Solution: Only process when explicitly mentioned

4. **Accuracy**: Place name variations
   - Solution: Use fuzzy matching, ask for clarification

## 🚀 Quick Start (Simplest Version)

1. Use OpenStreetMap Nominatim (free, no API key)
2. Simple location detection: regex for "in [place]"
3. Call geocoding when location detected
4. Add result to conversation context
5. Agent naturally mentions the location info

## 📝 Next Steps

1. ✅ Review this plan
2. Choose API (OpenStreetMap vs Google vs Mapbox)
3. Implement geocoding tool
4. Add location detection
5. Integrate with Live API
6. Test with real conversations

---

**Verdict**: This is **NOT too complicated**! It's a straightforward addition that enhances the conversation without major architecture changes. The hybrid approach keeps it simple while adding powerful location capabilities.
