import { GoogleGenerativeAI } from '@google/generative-ai';
import { config } from '../config.js';
import {
  LivingContextSummary,
  PredictiveModelResponse,
  PredictiveScenario,
  ScoredDocChunk,
  TimeOracleInsights
} from '../types.js';
import {
  analyzeMethodologyEvolution,
  EvolutionTrackerOptions
} from './evolution-tracker.js';

const genAI = new GoogleGenerativeAI(config.geminiApiKey);
const scenarioModel = genAI.getGenerativeModel({
  model: config.geminiModel,
  generationConfig: {
    temperature: 0.45,
    maxOutputTokens: 1_100
  }
});

export interface TimeOracleOptions {
  topic?: string;
  livingContext?: LivingContextSummary;
  evolutionOptions?: EvolutionTrackerOptions;
}

const formatShifts = (shifts: TimeOracleInsights['evolutionTimeline']): string =>
  shifts
    .map(shift => {
      const period = `(${shift.period.from} - ${shift.period.to})`;
      const drivers = shift.drivers.join(', ') || 'No drivers recorded';
      const docs = shift.representativeDocs
        .map(doc => `${doc.title} <${doc.url}>`)
        .join(' | ');
      return `${shift.phase} ${period}\nDrivers: ${drivers}\nDocs: ${docs}\nSummary: ${shift.shiftSummary}\n`;
    })
    .join('\n');

const formatPerspectives = (perspectives: TimeOracleInsights['temporalPerspective']): string =>
  perspectives
    .map(p => `${p.year}: ${p.viewpoint} (Refs: ${p.references.map(ref => ref.title).join(' | ')})`)
    .join('\n');

const safeParseScenarios = (payload: string): PredictiveModelResponse | undefined => {
  try {
    const jsonMatch = payload.match(/```(?:json)?\s*([\s\S]*?)\s*```/);
    const jsonText = jsonMatch ? jsonMatch[1] : payload;
    const parsed = JSON.parse(jsonText) as PredictiveModelResponse;
    return parsed;
  } catch (error) {
    console.error('Time Oracle scenario JSON parse failed:', error);
    return undefined;
  }
};

const normalizeScenarios = (scenarios: PredictiveScenario[]): PredictiveScenario[] =>
  scenarios.map(scenario => ({
    scenario: scenario.scenario,
    projection: scenario.projection,
    confidence: Math.max(0, Math.min(1, scenario.confidence)),
    leadingIndicators: scenario.leadingIndicators ?? [],
    references: scenario.references ?? []
  }));

export const buildTimeOracleInsights = async (
  query: string,
  docs: ScoredDocChunk[],
  options: TimeOracleOptions = {}
): Promise<TimeOracleInsights> => {
  const evolution = await analyzeMethodologyEvolution(query, docs, options.evolutionOptions);

  const prompt = `
You are the CoST Time Oracle.
Generate predictive scenarios and time-aware advice for the query "${query}".

Evolution timeline:
${formatShifts(evolution.shifts)}

Temporal perspectives:
${formatPerspectives(evolution.methodologyHighlights)}

Living context:
${options.livingContext ? options.livingContext.synthesis : 'No living context summary provided.'}

Respond with JSON:
{
  "scenario": "string (short label)",
  "projections": [
    { "scenario": "string", "projection": "string", "confidence": 0-1, "leadingIndicators": ["string"], "references": [{ "title": "string", "url": "string" }] }
  ],
  "confidenceNotes": "string",
  "generatedAt": "ISO timestamp"
}

After the JSON, stop. No markdown explanation.`.trim();

  let scenarioResponse: PredictiveModelResponse | undefined;

  try {
    const response = await scenarioModel.generateContent(prompt);
    scenarioResponse = safeParseScenarios(response.response.text().trim());
  } catch (error) {
    console.error('Time Oracle scenario generation failed:', error);
  }

  const predictiveScenarios = scenarioResponse
    ? normalizeScenarios(scenarioResponse.projections ?? [])
    : [];

  const recommendedActions = predictiveScenarios.length
    ? predictiveScenarios.map(scenario => `Prepare for "${scenario.scenario}": ${scenario.leadingIndicators.join(', ') || 'track qualitative community feedback.'}`)
    : [
        'Review historical CoST assurance findings to anticipate systemic risks.',
        'Engage multi-stakeholder groups early to stress-test upcoming reforms.'
      ];

  const insights: TimeOracleInsights = {
    temporalPerspective: evolution.methodologyHighlights,
    evolutionTimeline: evolution.shifts,
    predictiveScenarios,
    recommendedActions,
    generatedAt: scenarioResponse?.generatedAt ?? new Date().toISOString()
  };

  return insights;
};

export const getEvolutionOverview = analyzeMethodologyEvolution;

export const projectPredictiveScenario = async (
  scenario: string,
  docs: ScoredDocChunk[],
  options: TimeOracleOptions = {}
): Promise<PredictiveModelResponse> => {
  const evolution = await analyzeMethodologyEvolution(scenario, docs, options.evolutionOptions);

  const prompt = `
You are the Time Oracle. Build a predictive model for "${scenario}" using historical trends.

Evolution timeline:
${formatShifts(evolution.shifts)}

Temporal perspectives:
${formatPerspectives(evolution.methodologyHighlights)}

Return JSON:
{
  "scenario": "${scenario}",
  "projections": [
    { "scenario": "string", "projection": "string", "confidence": 0-1, "leadingIndicators": ["string"], "references": [{ "title": "string", "url": "string" }] }
  ],
  "confidenceNotes": "string",
  "generatedAt": "ISO timestamp"
}
`.trim();

  try {
    const response = await scenarioModel.generateContent(prompt);
    const parsed = safeParseScenarios(response.response.text().trim());
    if (parsed) {
      return {
        scenario: parsed.scenario || scenario,
        projections: normalizeScenarios(parsed.projections ?? []),
        confidenceNotes: parsed.confidenceNotes || 'Confidence based on historical trend stability.',
        generatedAt: parsed.generatedAt || new Date().toISOString()
      };
    }
  } catch (error) {
    console.error('Predictive scenario modeling failed:', error);
  }

  return {
    scenario,
    projections: [],
    confidenceNotes: 'No predictive projection available. Review historical documents manually.',
    generatedAt: new Date().toISOString()
  };
};
