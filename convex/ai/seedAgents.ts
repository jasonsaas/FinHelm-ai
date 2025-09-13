/**
 * Seed function to initialize all 25 AI agents in the database
 */

import { mutation } from "../_generated/server";
import { AGENT_CONFIGS, AgentType } from "./agentExecutor";

export const seedAgents = mutation({
  args: {},
  handler: async (ctx) => {
    // Check if agents already exist
    const existingAgents = await ctx.db.query("aiAgents").collect();
    
    if (existingAgents.length > 0) {
      return { message: "Agents already seeded", count: existingAgents.length };
    }
    
    // Insert all agents
    const insertedAgents: string[] = [];
    
    for (const [agentId, config] of Object.entries(AGENT_CONFIGS)) {
      await ctx.db.insert("aiAgents", {
        agentId: agentId as string,
        name: config.name,
        category: config.category,
        description: config.description,
        capabilities: config.capabilities,
        promptTemplate: config.promptTemplate,
        contextRequirements: config.contextRequirements,
        outputFormat: "mixed", // Default to mixed for all agents
        model: config.model,
        maxTokens: config.maxTokens,
        temperature: config.temperature,
        isActive: true,
        icon: config.icon,
        color: config.color,
        createdAt: Date.now(),
        updatedAt: Date.now(),
      });
      
      insertedAgents.push(agentId);
    }
    
    return {
      message: "Successfully seeded all AI agents",
      count: insertedAgents.length,
      agents: insertedAgents,
    };
  },
});