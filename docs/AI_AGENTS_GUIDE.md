# How AI Agents Are Made - A Complete Guide

This guide explains how AI agents work, their architecture, and how to build them.

## 🤖 What is an AI Agent?

An **AI Agent** is an AI system that can:
- **Perceive** its environment (through inputs like text, images, APIs)
- **Reason** about what to do (using an LLM like Gemini)
- **Act** on decisions (calling tools, APIs, functions)
- **Remember** past interactions (memory/context)
- **Plan** multi-step tasks (breaking down complex goals)

Unlike simple chatbots that just respond, agents can take actions in the real world.

---

## 🏗️ Core Components of an AI Agent

### 1. **LLM (Large Language Model) - The "Brain"**
- **Purpose**: Reasoning, decision-making, understanding
- **Examples**: GPT-4, Gemini, Claude
- **Role**: Processes input, decides what to do, generates responses

### 2. **Tools/Functions - The "Hands"**
- **Purpose**: Actions the agent can take
- **Examples**: 
  - API calls (search, weather, database)
  - Code execution
  - File operations
  - Web browsing
- **Role**: Execute actions based on LLM decisions

### 3. **Memory - The "Remembering"**
- **Purpose**: Store context and past interactions
- **Types**:
  - **Short-term**: Current conversation context
  - **Long-term**: Persistent storage (database, vector DB)
  - **Episodic**: Specific events/memories
- **Role**: Maintains continuity across interactions

### 4. **Planning/Orchestration - The "Strategy"**
- **Purpose**: Break down complex tasks into steps
- **Examples**: 
  - ReAct (Reasoning + Acting)
  - Chain of Thought
  - Tree of Thoughts
- **Role**: Organizes multi-step problem solving

### 5. **Environment Interface - The "Senses"**
- **Purpose**: Connect to external systems
- **Examples**: APIs, databases, file systems, web
- **Role**: Input/output channel

---

## 🔧 How to Build an AI Agent

### **Step 1: Choose Your LLM**

```typescript
// Example: Using Gemini (like in your project)
import { GoogleGenerativeAI } from '@google/generative-ai';

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);
const model = genAI.getGenerativeModel({ model: 'gemini-2.0-flash-exp' });
```

### **Step 2: Define Tools/Functions**

```typescript
// Define what actions the agent can take
const tools = [
  {
    name: "search_web",
    description: "Search the web for information",
    parameters: {
      type: "object",
      properties: {
        query: { type: "string", description: "Search query" }
      }
    },
    execute: async (query: string) => {
      // Call search API
      return searchResults;
    }
  },
  {
    name: "get_weather",
    description: "Get weather for a location",
    parameters: {
      type: "object",
      properties: {
        location: { type: "string" }
      }
    },
    execute: async (location: string) => {
      // Call weather API
      return weatherData;
    }
  },
  {
    name: "save_to_database",
    description: "Save data to database",
    parameters: {
      type: "object",
      properties: {
        data: { type: "object" }
      }
    },
    execute: async (data: any) => {
      // Save to PostgreSQL
      return { success: true };
    }
  }
];
```

### **Step 3: Create Agent Loop**

```typescript
class AIAgent {
  private model: any;
  private tools: Tool[];
  private memory: Memory;
  
  constructor(model: any, tools: Tool[]) {
    this.model = model;
    this.tools = tools;
    this.memory = new Memory();
  }
  
  async run(userInput: string) {
    // 1. Get context from memory
    const context = this.memory.getContext();
    
    // 2. Build prompt with tools available
    const prompt = this.buildPrompt(userInput, context, this.tools);
    
    // 3. Get LLM response (with tool calling)
    const response = await this.model.generateContent(prompt);
    
    // 4. Check if agent wants to use a tool
    if (response.toolCalls) {
      // 5. Execute tools
      const toolResults = await this.executeTools(response.toolCalls);
      
      // 6. Continue conversation with tool results
      const finalResponse = await this.model.generateContent([
        ...prompt,
        response,
        toolResults
      ]);
      
      return finalResponse;
    }
    
    // 7. Save to memory
    this.memory.add(userInput, response.text);
    
    return response;
  }
  
  private async executeTools(toolCalls: ToolCall[]) {
    const results = [];
    for (const call of toolCalls) {
      const tool = this.tools.find(t => t.name === call.name);
      if (tool) {
        const result = await tool.execute(call.parameters);
        results.push({ tool: call.name, result });
      }
    }
    return results;
  }
}
```

---

## 🎯 Types of AI Agents

### **1. Simple ReAct Agent**
**Pattern**: Reason → Act → Observe → Repeat

```typescript
async function reactAgent(question: string) {
  let context = "";
  
  for (let i = 0; i < 5; i++) { // Max 5 iterations
    // Think
    const thought = await llm.generate(`
      Question: ${question}
      Context: ${context}
      What should I do next?
    `);
    
    // Act (if tool needed)
    if (thought.needsTool) {
      const result = await executeTool(thought.tool, thought.params);
      context += `\nTool result: ${result}`;
    } else {
      // Answer
      return await llm.generate(`Final answer: ${thought.answer}`);
    }
  }
}
```

### **2. Tool-Using Agent (Function Calling)**
**Pattern**: LLM decides which function to call

```typescript
// Gemini supports function calling
const model = genAI.getGenerativeModel({
  model: 'gemini-2.0-flash-exp',
  tools: [{
    functionDeclarations: [
      {
        name: "search_photos",
        description: "Search for photos by person or date",
        parameters: {
          type: "object",
          properties: {
            person: { type: "string" },
            date: { type: "string" }
          }
        }
      }
    ]
  }]
});

// Agent automatically decides when to call functions
const result = await model.generateContent("Find photos of Roberto from 2005");
// If function call needed, model returns functionCall
```

### **3. Multi-Agent System**
**Pattern**: Multiple specialized agents work together

```typescript
class MultiAgentSystem {
  private agents = {
    photoAnalyzer: new PhotoAnalysisAgent(),
    storyGenerator: new StoryGenerationAgent(),
    faceMatcher: new FaceMatchingAgent()
  };
  
  async processPhoto(photo: string) {
    // Agent 1: Analyze photo
    const analysis = await this.agents.photoAnalyzer.analyze(photo);
    
    // Agent 2: Match faces
    const faces = await this.agents.faceMatcher.match(photo);
    
    // Agent 3: Generate story
    const story = await this.agents.storyGenerator.generate({
      analysis,
      faces
    });
    
    return { analysis, faces, story };
  }
}
```

### **4. Autonomous Agent (AutoGPT-style)**
**Pattern**: Agent sets its own goals and plans

```typescript
class AutonomousAgent {
  async run(goal: string) {
    const plan = await this.createPlan(goal);
    
    for (const step of plan.steps) {
      // Execute step
      const result = await this.executeStep(step);
      
      // Check if goal achieved
      if (await this.isGoalAchieved(goal, result)) {
        return result;
      }
      
      // Replan if needed
      if (result.needsReplan) {
        plan = await this.replan(plan, result);
      }
    }
  }
}
```

---

## 🧠 Agent Architectures

### **1. ReAct (Reasoning + Acting)**
```
User: "What's the weather in Paris and save it to my notes?"

Agent thinks:
  Thought: I need to get weather for Paris
  Action: get_weather(location="Paris")
  Observation: Weather is 72°F, sunny
  
  Thought: Now I need to save this to notes
  Action: save_to_notes(data="Paris: 72°F, sunny")
  Observation: Saved successfully
  
  Thought: I have the answer
  Final Answer: The weather in Paris is 72°F and sunny. I've saved it to your notes.
```

### **2. Plan-Execute**
```
User: "Create a birthday card for my mom"

Agent plans:
  1. Get mom's information (name, preferences)
  2. Generate card design
  3. Add personal message
  4. Save card

Agent executes:
  Step 1: get_person_info("mom") → "Maria, likes flowers"
  Step 2: generate_card(theme="flowers") → Card design
  Step 3: add_message("Happy Birthday Maria!") → Card with message
  Step 4: save_card(card) → Saved to album
```

### **3. Reflexion (Self-Correction)**
```
Agent tries task → Gets feedback → Reflects → Tries again better

Attempt 1: "I'll search for photos"
  Result: Found 0 photos
  Reflection: "I should search by person name, not just 'photos'"
  
Attempt 2: "I'll search for photos of Roberto"
  Result: Found 5 photos
  Reflection: "Good! This worked."
```

---

## 💻 Building an Agent for Your Project

### **Example: Memory Keeper Agent**

```typescript
// src/lib/memory-agent.ts

import { GoogleGenerativeAI } from '@google/generative-ai';
import { findMatchingFace, saveFaceEmbedding } from './face-db';
import { generateStory } from './story-generator';

class MemoryKeeperAgent {
  private model: any;
  private memory: ConversationMemory;
  
  constructor() {
    const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY!);
    this.model = genAI.getGenerativeModel({
      model: 'gemini-2.0-flash-exp',
      tools: [{
        functionDeclarations: [
          {
            name: "find_person_in_photo",
            description: "Find if a person is recognized in a photo",
            parameters: {
              type: "object",
              properties: {
                faceEmbedding: {
                  type: "array",
                  items: { type: "number" },
                  description: "128-dim face embedding"
                },
                userId: { type: "string" }
              }
            }
          },
          {
            name: "save_person",
            description: "Save a new person to memory bank",
            parameters: {
              type: "object",
              properties: {
                name: { type: "string" },
                embedding: { type: "array" },
                photoId: { type: "string" }
              }
            }
          },
          {
            name: "generate_story",
            description: "Generate story from conversation",
            parameters: {
              type: "object",
              properties: {
                sessionId: { type: "string" },
                messages: { type: "array" },
                photos: { type: "array" }
              }
            }
          }
        ]
      }]
    });
  }
  
  async processPhoto(photoBase64: string, userId: string) {
    // Agent analyzes photo and decides what to do
    const response = await this.model.generateContent([
      {
        inlineData: {
          mimeType: "image/jpeg",
          data: photoBase64
        }
      },
      "Analyze this photo and help preserve the memory. " +
      "If you see faces, try to recognize them. " +
      "Ask questions to learn the story."
    ]);
    
    // Check if agent wants to use tools
    if (response.functionCalls) {
      for (const call of response.functionCalls) {
        if (call.name === "find_person_in_photo") {
          const match = await findMatchingFace(
            call.args.faceEmbedding,
            call.args.userId
          );
          // Continue conversation with match result
        }
      }
    }
    
    return response;
  }
}
```

---

## 🔄 Agent Loop Pattern

```typescript
async function agentLoop(initialGoal: string) {
  let state = {
    goal: initialGoal,
    context: [],
    completed: false
  };
  
  while (!state.completed && state.context.length < 10) {
    // 1. Observe current state
    const observation = observe(state);
    
    // 2. Think/Plan
    const thought = await think(state, observation);
    
    // 3. Decide action
    const action = decide(thought);
    
    // 4. Execute action
    const result = await execute(action);
    
    // 5. Update state
    state = updateState(state, result);
    
    // 6. Check if goal achieved
    if (isGoalAchieved(state)) {
      state.completed = true;
    }
  }
  
  return state;
}
```

---

## 🛠️ Popular Agent Frameworks

### **1. LangChain**
```python
from langchain.agents import initialize_agent, Tool
from langchain.llms import OpenAI

tools = [
    Tool(name="Search", func=search_tool),
    Tool(name="Calculator", func=calculator)
]

agent = initialize_agent(
    tools, 
    llm, 
    agent="zero-shot-react-description"
)

agent.run("What's the weather in Paris?")
```

### **2. AutoGPT**
- Autonomous agent that sets its own goals
- Uses multiple LLM calls for planning
- Can browse web, write files, execute code

### **3. BabyAGI**
- Task management agent
- Creates, prioritizes, and executes tasks
- Uses vector DB for memory

### **4. CrewAI**
- Multi-agent collaboration
- Agents have roles and work together
- Good for complex workflows

---

## 🎯 Your Project's Agent-Like Features

Your Memory Keeper app already has agent-like behavior:

### **1. Proactive Questioning**
```typescript
// In your Live API system instruction
"BE PROACTIVE - Always ask thoughtful follow-up questions"
```
This is agent behavior - the AI decides when to ask questions.

### **2. Tool Usage (Future)**
```typescript
// Could add function calling:
{
  name: "capture_photo",
  description: "Capture the photo being shown",
  execute: () => capturePhoto()
}
```

### **3. Memory/Context**
```typescript
// Your conversation storage is agent memory
const session = {
  messages: [...], // Short-term memory
  photos: [...],    // Visual memory
  dossier: {...}     // Extracted facts
};
```

### **4. Multi-Step Planning**
```typescript
// Story generation is a multi-step agent task:
1. Analyze photo
2. Start conversation
3. Ask questions
4. Extract information
5. Generate story
6. Create video
```

---

## 📚 Key Concepts

### **Tool Calling / Function Calling**
LLM decides which function to call and with what parameters.

### **ReAct Pattern**
Reason about what to do → Act → Observe result → Repeat.

### **Memory Types**
- **Episodic**: Specific events ("User showed photo of beach")
- **Semantic**: Facts ("Roberto is the user's father")
- **Working**: Current context (conversation history)

### **Orchestration**
Coordinating multiple steps, tools, and decisions.

---

## 🚀 Building Your First Agent

### **Simple Example: Weather Agent**

```typescript
class WeatherAgent {
  async getWeather(location: string) {
    // 1. Reason: Do I need to search?
    const needsSearch = !this.memory.hasWeather(location);
    
    if (needsSearch) {
      // 2. Act: Call weather API
      const weather = await fetch(`/api/weather?location=${location}`);
      
      // 3. Remember: Save result
      this.memory.saveWeather(location, weather);
      
      return weather;
    } else {
      // 4. Use memory
      return this.memory.getWeather(location);
    }
  }
}
```

---

## 🎓 Summary

**AI Agents = LLM + Tools + Memory + Planning**

1. **LLM** provides reasoning
2. **Tools** provide actions
3. **Memory** provides context
4. **Planning** organizes steps

Your Memory Keeper app is already using agent patterns:
- ✅ Proactive questioning (agent decision-making)
- ✅ Multi-step workflows (story generation)
- ✅ Context memory (conversation storage)
- ✅ Tool integration (face recognition, photo analysis)

To make it more "agent-like", you could add:
- Function calling for tool selection
- Self-correction/reflection
- Goal-oriented planning
- Multi-agent collaboration

---

This is how AI agents work! They're essentially LLMs with the ability to take actions and remember context, making them much more powerful than simple chatbots.
